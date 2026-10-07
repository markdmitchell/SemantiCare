/**
 * High-Fidelity HL7 v2 Structural Parser
 * Ported 1:1 from app/core/hl7_parser.py
 */
import { getSegmentInfo, getFieldInfo, getComponentName } from './hl7Dictionary';
import type { HL7Metadata, HL7Segment, HL7Field, HL7Repetition, HL7Component, ParseHL7Response } from '../types/hl7';

export interface HL7Delimiters {
  field: string;
  component: string;
  repetition: string;
  escape: string;
  subcomponent: string;
}

function defaultDelimiters(): HL7Delimiters {
  return { field: '|', component: '^', repetition: '~', escape: '\\', subcomponent: '&' };
}

export function unescapeHl7(text: string, delimiters: HL7Delimiters): string {
  if (!text || !text.includes(delimiters.escape)) return text;
  const esc = delimiters.escape;
  return text
    .split(`${esc}F${esc}`).join(delimiters.field)
    .split(`${esc}S${esc}`).join(delimiters.component)
    .split(`${esc}T${esc}`).join(delimiters.subcomponent)
    .split(`${esc}R${esc}`).join(delimiters.repetition)
    .split(`${esc}E${esc}`).join(delimiters.escape)
    .split(`${esc}.br${esc}`).join("\n");
}

export function extractDelimiters(mshLine: string): HL7Delimiters {
  if (!mshLine.startsWith('MSH') || mshLine.length < 4) {
    return defaultDelimiters();
  }

  const fieldDelim = mshLine[3];
  const remaining = mshLine.slice(4);
  const parts = remaining.split(fieldDelim);
  const encChars = parts.length > 0 ? parts[0] : '^~\\&';

  const compDelim = encChars.length > 0 ? encChars[0] : '^';
  const repDelim = encChars.length > 1 ? encChars[1] : '~';
  const escDelim = encChars.length > 2 ? encChars[2] : '\\';
  const subcompDelim = encChars.length > 3 ? encChars[3] : '&';

  return {
    field: fieldDelim,
    component: compDelim,
    repetition: repDelim,
    escape: escDelim,
    subcomponent: subcompDelim,
  };
}

export function parseFieldContent(rawValue: string, dataType: string, delimiters: HL7Delimiters): HL7Repetition[] {
  if (!rawValue) return [];

  const rawRepetitions = rawValue.split(delimiters.repetition);
  const parsedRepetitions: HL7Repetition[] = [];

  rawRepetitions.forEach((repStr, repIdx0) => {
    const repIdx = repIdx0 + 1;
    const componentsRaw = repStr.split(delimiters.component);
    const parsedComponents: HL7Component[] = [];

    componentsRaw.forEach((compStr, compIdx0) => {
      const compIdx = compIdx0 + 1;
      if (!compStr) return;

      const compName = getComponentName(dataType, compIdx);
      const subcomponents = delimiters.subcomponent && compStr.includes(delimiters.subcomponent)
        ? compStr.split(delimiters.subcomponent)
        : [];
      const cleanSubcomponents = subcomponents.length > 1
        ? subcomponents.map((sc) => unescapeHl7(sc, delimiters))
        : [];

      parsedComponents.push({
        component_index: compIdx,
        name: compName,
        value: unescapeHl7(compStr, delimiters),
        subcomponents: cleanSubcomponents,
      });
    });

    parsedRepetitions.push({
      repetition_index: repIdx,
      raw: repStr,
      components: parsedComponents,
    });
  });

  return parsedRepetitions;
}

export function parseHl7Message(rawMessage: string): ParseHL7Response {
  const cleanedInput = (rawMessage || '').trim();
  if (!cleanedInput) {
    return {
      success: false,
      is_valid: false,
      error: 'Empty message provided.',
      segments: [],
      metadata: {} as HL7Metadata,
    };
  }

  const lines = cleanedInput
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      is_valid: false,
      error: 'No valid segments found in message.',
      segments: [],
      metadata: {} as HL7Metadata,
    };
  }

  const firstLine = lines[0];
  const warnings: string[] = [];
  let delimiters: HL7Delimiters;
  if (!firstLine.startsWith('MSH')) {
    warnings.push("First segment is not MSH (Message Header). Delimiters defaulted to standard HL7 '|' and '^~\\&'.");
    delimiters = defaultDelimiters();
  } else {
    delimiters = extractDelimiters(firstLine);
  }

  const parsedSegments: HL7Segment[] = [];
  const segmentCounts: Record<string, number> = {};

  lines.forEach((line, segIdx) => {
    let segId: string;
    if (line.includes(delimiters.field)) {
      segId = line.split(delimiters.field)[0];
    } else {
      segId = line.slice(0, 3);
    }
    segId = segId.trim();
    segmentCounts[segId] = (segmentCounts[segId] || 0) + 1;
    const segMeta = getSegmentInfo(segId);

    const parsedFields: HL7Field[] = [];

    if (segId === 'MSH') {
      parsedFields.push({
        field_index: 1,
        name: 'Field Separator',
        type: 'ST',
        description: 'Delimiter separating fields in the message.',
        raw_value: delimiters.field,
        repetitions: [
          {
            repetition_index: 1,
            raw: delimiters.field,
            components: [{ component_index: 1, name: 'Separator', value: delimiters.field, subcomponents: [] }],
          },
        ],
      });

      const mshRemainder = line.slice(4); // past "MSH|"
      const mshTokens = mshRemainder.split(delimiters.field);

      mshTokens.forEach((token, i) => {
        const fieldNum = i + 2;
        const fMeta = getFieldInfo('MSH', fieldNum);
        const fieldReps = parseFieldContent(token, fMeta.type || 'ST', delimiters);
        parsedFields.push({
          field_index: fieldNum,
          name: fMeta.name || `Field ${fieldNum}`,
          type: fMeta.type || 'ST',
          description: fMeta.description || '',
          raw_value: token,
          repetitions: fieldReps,
        });
      });
    } else {
      const tokens = line.split(delimiters.field);
      const fieldTokens = tokens.slice(1);
      fieldTokens.forEach((token, i) => {
        const fieldNum = i + 1;
        const fMeta = getFieldInfo(segId, fieldNum);
        const fieldReps = parseFieldContent(token, fMeta.type || 'ST', delimiters);
        parsedFields.push({
          field_index: fieldNum,
          name: fMeta.name || `Field ${fieldNum}`,
          type: fMeta.type || 'ST',
          description: fMeta.description || '',
          raw_value: token,
          repetitions: fieldReps,
        });
      });
    }

    parsedSegments.push({
      segment_id: segId,
      unique_id: `${segId}_${segIdx}`,
      order_index: segIdx + 1,
      title: segMeta.name || segId,
      description: segMeta.description || '',
      is_custom: segMeta.is_custom || false,
      raw: line,
      fields: parsedFields,
    });
  });

  const metadata: HL7Metadata = {
    delimiters: {
      field: delimiters.field,
      component: delimiters.component,
      repetition: delimiters.repetition,
      escape: delimiters.escape,
      subcomponent: delimiters.subcomponent,
    },
    total_segments: parsedSegments.length,
    segment_counts: segmentCounts,
    warnings,
  };

  const mshSeg = parsedSegments.find((s) => s.segment_id === 'MSH');
  if (mshSeg) {
    const fieldsByNum: Record<number, string> = {};
    mshSeg.fields.forEach((f) => {
      fieldsByNum[f.field_index] = f.raw_value;
    });
    metadata.sending_application = fieldsByNum[3] ?? '';
    metadata.sending_facility = fieldsByNum[4] ?? '';
    metadata.receiving_application = fieldsByNum[5] ?? '';
    metadata.receiving_facility = fieldsByNum[6] ?? '';
    metadata.message_datetime = fieldsByNum[7] ?? '';
    metadata.message_type = fieldsByNum[9] ?? '';
    metadata.message_control_id = fieldsByNum[10] ?? '';
    metadata.processing_id = fieldsByNum[11] ?? '';
    metadata.hl7_version = fieldsByNum[12] ?? '';
  }

  return {
    success: true,
    is_valid: true,
    metadata,
    segments: parsedSegments,
  };
}
