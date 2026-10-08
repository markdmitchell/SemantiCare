/**
 * Semantic Data Mapping Engine (HL7 v2 to FHIR R4)
 * Ported 1:1 from app/engine/mapper.py
 */
import type { HL7Segment } from '../types/hl7';
import { lookupLoinc, matchTerminology, validateUcum, inferMissingUnitCandidates } from './loincCatalog';
import type { TokenVault } from './phiScrubber';
import type { AmbiguityFlag, MappingLineage, ResourceConfidence } from '../types/hl7';
import { findMatchingRule, incrementRuleUsage } from './rulesStore';
import { extractEntitiesFromNte } from './clinicalNer';

function uuidHex(len: number): string {
  const bytes = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, len);
}

export function parseHl7Datetime(hl7Ts: string): string {
  if (!hl7Ts) {
    return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  }
  const clean = hl7Ts.replace(/[^\d]/g, '');
  try {
    if (clean.length >= 14) {
      const y = clean.slice(0, 4), mo = clean.slice(4, 6), d = clean.slice(6, 8);
      const h = clean.slice(8, 10), mi = clean.slice(10, 12), s = clean.slice(12, 14);
      return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
    } else if (clean.length >= 12) {
      const y = clean.slice(0, 4), mo = clean.slice(4, 6), d = clean.slice(6, 8);
      const h = clean.slice(8, 10), mi = clean.slice(10, 12);
      return `${y}-${mo}-${d}T${h}:${mi}:00Z`;
    } else if (clean.length >= 8) {
      const y = clean.slice(0, 4), mo = clean.slice(4, 6), d = clean.slice(6, 8);
      return `${y}-${mo}-${d}`;
    }
  } catch {
    // fall through
  }
  return hl7Ts;
}

export function parseHl7Date(hl7Dt: string): string {
  if (!hl7Dt) return '';
  const clean = hl7Dt.replace(/[^\d]/g, '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return hl7Dt;
}

export function mapGender(hl7Gender: string): string {
  const g = (hl7Gender || '').toUpperCase().trim();
  if (g === 'M') return 'male';
  if (g === 'F') return 'female';
  if (g === 'O') return 'other';
  return 'unknown';
}

export function mapEncounterClass(pv1PatientClass: string): { system: string; code: string; display: string } {
  const pc = (pv1PatientClass || '').toUpperCase().trim();
  const sys = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
  if (pc === 'I') return { system: sys, code: 'IMP', display: 'inpatient encounter' };
  if (pc === 'O') return { system: sys, code: 'AMB', display: 'ambulatory' };
  if (pc === 'E') return { system: sys, code: 'EMER', display: 'emergency' };
  if (pc === 'P') return { system: sys, code: 'PRENC', display: 'pre-admission' };
  return { system: sys, code: 'AMB', display: 'ambulatory' };
}

export function mapObservationInterpretation(flag: string): any[] {
  if (!flag) return [];
  const f = flag.toUpperCase().trim();
  const mapping: Record<string, { code: string; display: string }> = {
    H: { code: 'H', display: 'High' },
    HH: { code: 'HH', display: 'Critically High' },
    L: { code: 'L', display: 'Low' },
    LL: { code: 'LL', display: 'Critically Low' },
    N: { code: 'N', display: 'Normal' },
    A: { code: 'A', display: 'Abnormal' },
    AA: { code: 'AA', display: 'Critically Abnormal' },
  };
  if (mapping[f]) {
    const e = mapping[f];
    return [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: e.code, display: e.display }],
        text: e.display,
      },
    ];
  }
  return [];
}

function fieldsByIndex(seg: HL7Segment): Record<number, any> {
  const out: Record<number, any> = {};
  for (const f of seg.fields || []) {
    out[f.field_index] = f;
  }
  return out;
}

export class SemanticMapper {
  patientId: string;
  patientUrn: string;
  encounterId: string;
  encounterUrn: string;
  facility: string = '*';
  ambiguities: AmbiguityFlag[] = [];
  lineage: MappingLineage[] = [];
  confidenceCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };

  constructor() {
    this.patientId = `pat-${uuidHex(8)}`;
    this.patientUrn = `urn:uuid:${this.patientId}`;
    this.encounterId = `enc-${uuidHex(8)}`;
    this.encounterUrn = `urn:uuid:${this.encounterId}`;
  }

  private recordConfidence(level: string, count: number = 1) {
    this.confidenceCounts[level] = (this.confidenceCounts[level] || 0) + count;
  }

  mapPatient(pidSeg: HL7Segment, nk1Segs: HL7Segment[]): any {
    const fields = fieldsByIndex(pidSeg);

    const patient: any = {
      resourceType: 'Patient',
      id: this.patientId,
      meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'] },
    };

    // Identifier (PID-3)
    if (fields[3] && fields[3].raw_value) {
      const idField = fields[3];
      let mrnVal = idField.raw_value;
      let assigningAuth = 'urn:oid:hospital-mrn';
      if (idField.repetitions.length && idField.repetitions[0].components.length) {
        const comps = idField.repetitions[0].components;
        mrnVal = comps[0].value;
        if (comps.length >= 4 && comps[3].value) {
          assigningAuth = `urn:oid:${comps[3].value.toLowerCase()}`;
        }
      }
      patient.identifier = [
        {
          use: 'usual',
          type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'Medical Record Number' }] },
          system: assigningAuth,
          value: mrnVal,
        },
      ];
      this.lineage.push({ fhir_path: 'Patient.identifier[0]', hl7_source: 'PID-3', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Name (PID-5)
    if (fields[5] && fields[5].raw_value) {
      const nameField = fields[5];
      let family = '';
      const given: string[] = [];
      if (nameField.repetitions.length && nameField.repetitions[0].components.length) {
        const comps = nameField.repetitions[0].components;
        if (comps.length >= 1) family = comps[0].value;
        if (comps.length >= 2 && comps[1].value) given.push(comps[1].value);
        if (comps.length >= 3 && comps[2].value) given.push(comps[2].value);
      }
      patient.name = [{ use: 'official', family, given, text: `${given.join(' ')} ${family}`.trim() }];
      this.lineage.push({ fhir_path: 'Patient.name[0]', hl7_source: 'PID-5', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Birth Date (PID-7)
    if (fields[7] && fields[7].raw_value) {
      patient.birthDate = parseHl7Date(fields[7].raw_value);
      this.lineage.push({ fhir_path: 'Patient.birthDate', hl7_source: 'PID-7', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Gender (PID-8)
    if (fields[8] && fields[8].raw_value) {
      patient.gender = mapGender(fields[8].raw_value);
      this.lineage.push({ fhir_path: 'Patient.gender', hl7_source: 'PID-8', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Address (PID-11)
    if (fields[11] && fields[11].raw_value) {
      const addrField = fields[11];
      let line = '', city = '', state = '', postalCode = '', country = 'USA';
      if (addrField.repetitions.length && addrField.repetitions[0].components.length) {
        const comps = addrField.repetitions[0].components;
        if (comps.length >= 1) line = comps[0].value;
        if (comps.length >= 3) city = comps[2].value;
        if (comps.length >= 4) state = comps[3].value;
        if (comps.length >= 5) postalCode = comps[4].value;
        if (comps.length >= 6) country = comps[5].value;
      }
      patient.address = [{ use: 'home', line: line ? [line] : [], city, state, postalCode, country }];
      this.lineage.push({ fhir_path: 'Patient.address[0]', hl7_source: 'PID-11', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Telecom (PID-13)
    if (fields[13] && fields[13].raw_value) {
      patient.telecom = [{ system: 'phone', value: fields[13].raw_value, use: 'home' }];
      this.lineage.push({ fhir_path: 'Patient.telecom[0]', hl7_source: 'PID-13', confidence: 'high' });
      this.recordConfidence('high');
    }

    // US Core Race Extension (PID-10)
    const extensions: any[] = [];
    if (fields[10] && fields[10].raw_value) {
      const raceRaw = fields[10].raw_value;
      let code = '2106-3', text = 'White';
      if (raceRaw.includes('^')) {
        const parts = raceRaw.split('^');
        code = parts[0];
        text = parts.length > 1 ? parts[1] : text;
      }
      extensions.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
        extension: [
          { url: 'ombCategory', valueCoding: { system: 'urn:oid:2.16.840.1.113883.6.238', code, display: text } },
          { url: 'text', valueString: text },
        ],
      });
      this.lineage.push({ fhir_path: 'Patient.extension[us-core-race]', hl7_source: 'PID-10', confidence: 'high' });
      this.recordConfidence('high');
    }

    // US Core Ethnicity Extension (PID-22)
    if (fields[22] && fields[22].raw_value) {
      const ethRaw = fields[22].raw_value;
      let code = '2186-5', text = 'Not Hispanic or Latino';
      if (ethRaw.includes('^')) {
        const parts = ethRaw.split('^');
        code = parts[0];
        text = parts.length > 1 ? parts[1] : text;
      }
      extensions.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
        extension: [
          { url: 'ombCategory', valueCoding: { system: 'urn:oid:2.16.840.1.113883.6.238', code, display: text } },
          { url: 'text', valueString: text },
        ],
      });
      this.lineage.push({ fhir_path: 'Patient.extension[us-core-ethnicity]', hl7_source: 'PID-22', confidence: 'high' });
      this.recordConfidence('high');
    }

    if (extensions.length) {
      patient.extension = extensions;
    }

    // Next of Kin / Contact (NK1)
    if (nk1Segs.length) {
      const contacts: any[] = [];
      for (const nk of nk1Segs) {
        const nkFields = fieldsByIndex(nk);
        const contactEntry: any = {};
        if (nkFields[2] && nkFields[2].raw_value) {
          const nkName = nkFields[2].raw_value.split('^');
          contactEntry.name = {
            family: nkName.length > 0 ? nkName[0] : '',
            given: nkName.length > 1 ? [nkName[1]] : [],
          };
        }
        if (nkFields[3] && nkFields[3].raw_value) {
          const relParts = nkFields[3].raw_value.split('^');
          contactEntry.relationship = [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                  code: relParts[0],
                  display: relParts.length > 1 ? relParts[1] : 'Contact',
                },
              ],
            },
          ];
        }
        if (nkFields[5] && nkFields[5].raw_value) {
          contactEntry.telecom = [{ system: 'phone', value: nkFields[5].raw_value }];
        }
        if (Object.keys(contactEntry).length) {
          contacts.push(contactEntry);
        }
      }
      if (contacts.length) {
        patient.contact = contacts;
        this.lineage.push({ fhir_path: 'Patient.contact', hl7_source: 'NK1', confidence: 'high' });
        this.recordConfidence('high');
      }
    }

    return patient;
  }

  mapEncounter(pv1Seg: HL7Segment, ztrSeg: HL7Segment | undefined): any {
    const fields = fieldsByIndex(pv1Seg);

    const patientClass = fields[2]?.raw_value ?? 'I';
    const encounterClass = mapEncounterClass(patientClass);

    const encounter: any = {
      resourceType: 'Encounter',
      id: this.encounterId,
      status: 'in-progress',
      class: encounterClass,
      subject: { reference: this.patientUrn },
    };

    // Assigned Location (PV1-3)
    if (fields[3] && fields[3].raw_value) {
      const locStr = fields[3].raw_value;
      encounter.location = [{ location: { display: locStr.split('^').join(' / ') }, status: 'active' }];
      this.lineage.push({ fhir_path: 'Encounter.location[0]', hl7_source: 'PV1-3', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Attending Practitioner (PV1-7)
    if (fields[7] && fields[7].raw_value) {
      const docParts = fields[7].raw_value.split('^');
      const npi = docParts.length > 0 ? docParts[0] : '';
      const family = docParts.length > 1 ? docParts[1] : '';
      const given = docParts.length > 2 ? docParts[2] : '';

      encounter.participant = [
        {
          type: [
            {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType', code: 'ATND', display: 'attender' }],
            },
          ],
          individual: {
            identifier: { system: 'http://hl7.org/fhir/sid/us-npi', value: npi },
            display: `Dr. ${given} ${family}`.trim(),
          },
        },
      ];
      this.lineage.push({ fhir_path: 'Encounter.participant[0]', hl7_source: 'PV1-7', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Period (PV1-44 start, PV1-45 end)
    const period: Record<string, string> = {};
    if (fields[44] && fields[44].raw_value) {
      period.start = parseHl7Datetime(fields[44].raw_value);
    }
    if (fields[45] && fields[45].raw_value) {
      period.end = parseHl7Datetime(fields[45].raw_value);
      encounter.status = 'finished';
    }

    if (Object.keys(period).length) {
      encounter.period = period;
      this.lineage.push({ fhir_path: 'Encounter.period', hl7_source: 'PV1-44 / PV1-45', confidence: 'high' });
      this.recordConfidence('high');
    }

    // Custom ZTR segment mapped as Encounter extension
    if (ztrSeg) {
      const ztrFields = fieldsByIndex(ztrSeg);
      const transportMode = ztrFields[2]?.raw_value ?? 'Unknown Transport';
      const isolationStatus = ztrFields[3]?.raw_value ?? '';

      const exts: any[] = [{ url: 'transportMode', valueString: transportMode }];
      if (isolationStatus) {
        exts.push({ url: 'isolationStatus', valueString: isolationStatus });
      }

      encounter.extension = [
        { url: 'http://example.org/fhir/StructureDefinition/encounter-patient-transport', extension: exts },
      ];
      this.ambiguities.push({
        id: `amb-ztr-${uuidHex(6)}`,
        type: 'CUSTOM_Z_SEGMENT',
        severity: 'info',
        field_location: 'ZTR',
        title: 'Proprietary Transport Segment (ZTR) Mapped',
        message: `Successfully mapped hospital transport mode '${transportMode}' as an Encounter extension.`,
        target_resource_id: this.encounterId,
      });
      this.lineage.push({ fhir_path: 'Encounter.extension[encounter-patient-transport]', hl7_source: 'ZTR', confidence: 'medium' });
      this.recordConfidence('medium');
    }

    return encounter;
  }

  mapObservationsAndReports(
    obrSegs: HL7Segment[],
    obxSegs: HL7Segment[],
    nteSegs: HL7Segment[],
    zdsSeg: HL7Segment | undefined
  ): { observations: any[]; reports: any[] } {
    const observations: any[] = [];
    const reports: any[] = [];
    const obsUrnMap: string[] = [];

    obxSegs.forEach((obx, idx0) => {
      const idx = idx0 + 1;
      const fields = fieldsByIndex(obx);
      const obsId = `obs-${uuidHex(8)}`;
      const obsUrn = `urn:uuid:${obsId}`;
      obsUrnMap.push(obsUrn);

      const obsCodeRaw = fields[3]?.raw_value ?? `UNKNOWN_${idx}`;
      const valueType = fields[2]?.raw_value ?? 'ST';
      const rawVal = fields[5]?.raw_value ?? '';
      const rawUnits = fields[6]?.raw_value ?? '';
      const rawRefRange = fields[7]?.raw_value ?? '';
      const rawFlag = fields[8]?.raw_value ?? '';
      const statusCode = fields[11]?.raw_value ?? 'F';

      let parsedCode = '';
      let displayName = '';
      let system = 'http://loinc.org';

      if (obsCodeRaw.includes('^')) {
        const parts = obsCodeRaw.split('^');
        parsedCode = parts[0].trim();
        displayName = parts.length > 1 ? parts[1].trim() : '';
        if (parts.length > 2 && ['LN', 'LOINC'].includes(parts[2].trim())) {
          system = 'http://loinc.org';
        }
      } else {
        parsedCode = obsCodeRaw.trim();
        displayName = obsCodeRaw.trim();
      }

      // 1. Check Institutional Rulebase (Mapping Memory)
      const termRule = findMatchingRule(this.facility, 'LOCAL_TERMINOLOGY', parsedCode);
      let isGrounded = false;
      if (termRule) {
        parsedCode = termRule.target_value;
        displayName = termRule.target_display || displayName;
        incrementRuleUsage(termRule.id);
        this.ambiguities.push({
          id: `amb-term-${obsId}`,
          type: 'LOCAL_TERMINOLOGY',
          severity: 'info',
          field_location: `OBX-3 (Index ${idx})`,
          title: `Local Code '${termRule.source_key}' Auto-Resolved`,
          message: `Auto-resolved to LOINC ${termRule.target_value} via institutional rule for facility '${termRule.facility}' (Author: ${termRule.author}).`,
          suggested_options: [`${termRule.target_value} - ${displayName}`],
          default_choice: `${termRule.target_value} - ${displayName}`,
          target_resource_id: obsId,
          is_resolved: true,
          resolved_value: termRule.target_value,
          resolved_by: `Institutional Rule (${termRule.id})`,
        });
        this.recordConfidence('high');
        isGrounded = true;
      } else {
        const loincEntry = lookupLoinc(parsedCode);
        isGrounded = loincEntry !== null;

        let matchedCandidates: ReturnType<typeof matchTerminology> = [];
        if (!isGrounded) {
          matchedCandidates = matchTerminology(displayName || parsedCode);
          if (matchedCandidates.length) {
            const top = matchedCandidates[0];
            this.ambiguities.push({
              id: `amb-term-${obsId}`,
              type: 'LOCAL_TERMINOLOGY',
              severity: 'warning',
              field_location: `OBX-3 (Index ${idx})`,
              title: `Local Code '${parsedCode}' Grounded to LOINC`,
              message: `Local test '${displayName}' mapped to LOINC ${top.code} (${top.display}) with ${Math.round(top.confidence * 100)}% confidence.`,
              suggested_options: matchedCandidates.map((c) => `${c.code} - ${c.display}`),
              default_choice: `${top.code} - ${top.display}`,
              target_resource_id: obsId,
            });
            parsedCode = top.code;
            displayName = top.display;
            this.recordConfidence('medium');
          } else {
            this.recordConfidence('low');
          }
        } else {
          displayName = loincEntry!.display;
          this.recordConfidence('high');
        }
      }

      let categoryCode = 'laboratory';
      let categoryDisplay = 'Laboratory';
      if (['pressure', 'temperature', 'heart rate', 'pulse', 'weight', 'height', 'saturation', 'bmi'].some((t) => displayName.toLowerCase().includes(t))) {
        categoryCode = 'vital-signs';
        categoryDisplay = 'Vital Signs';
      }

      const observation: any = {
        resourceType: 'Observation',
        id: obsId,
        status: statusCode === 'F' ? 'final' : 'preliminary',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: categoryCode, display: categoryDisplay }] }],
        code: { coding: [{ system, code: parsedCode, display: displayName }], text: displayName },
        subject: { reference: this.patientUrn },
        encounter: { reference: this.encounterUrn },
      };

      // Handle Compound Blood Pressure (e.g. 138/88)
      if (rawVal.includes('/') && categoryCode === 'vital-signs' && (displayName.toLowerCase().includes('blood pressure') || displayName.toLowerCase().includes('bp'))) {
        const bpParts = rawVal.split('/');
        const systolicVal = parseFloat(bpParts[0].trim());
        const diastolicVal = parseFloat(bpParts[1]?.trim());
        if (!Number.isNaN(systolicVal) && !Number.isNaN(diastolicVal)) {
          observation.code = {
            coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel with all children optional' }],
            text: 'Blood pressure panel',
          };
          observation.component = [
            {
              code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }], text: 'Systolic blood pressure' },
              valueQuantity: { value: systolicVal, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
            },
            {
              code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }], text: 'Diastolic blood pressure' },
              valueQuantity: { value: diastolicVal, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
            },
          ];
          this.ambiguities.push({
            id: `amb-bp-${obsId}`,
            type: 'COMPOUND_VALUE',
            severity: 'info',
            field_location: `OBX-5 (Index ${idx})`,
            title: 'Compound Blood Pressure Decomposed',
            message: `String '${rawVal}' parsed into standard FHIR systolic (${systolicVal} mm[Hg]) and diastolic (${diastolicVal} mm[Hg]) components.`,
            target_resource_id: obsId,
          });
          this.lineage.push({ fhir_path: `Observation[${obsId}].component`, hl7_source: `OBX-5 (Index ${idx})`, confidence: 'high' });
          this.recordConfidence('high', 2);
          observations.push(observation);
          return;
        }
      }

      // Handle Missing UCUM Unit
      let unitVal = rawUnits.trim();
      if (!unitVal && valueType === 'NM') {
        const unitRule = findMatchingRule(this.facility, 'MISSING_UNIT', parsedCode);
        if (unitRule) {
          unitVal = unitRule.target_value;
          incrementRuleUsage(unitRule.id);
          this.ambiguities.push({
            id: `amb-unit-${obsId}`,
            type: 'MISSING_UNIT',
            severity: 'info',
            field_location: `OBX-6 (Index ${idx})`,
            title: `Missing Unit for ${displayName} Auto-Resolved`,
            message: `Auto-resolved unit '${unitRule.target_value}' via institutional rule for facility '${unitRule.facility}' (Author: ${unitRule.author}).`,
            suggested_options: [unitRule.target_value],
            default_choice: unitRule.target_value,
            target_resource_id: obsId,
            target_property_path: 'valueQuantity.unit',
            is_resolved: true,
            resolved_value: unitRule.target_value,
            resolved_by: `Institutional Rule (${unitRule.id})`,
          });
          this.recordConfidence('high');
        } else {
          const candidates = inferMissingUnitCandidates(displayName);
          const defaultUnit = candidates.length ? candidates[0] : '1';
          unitVal = defaultUnit;
          this.ambiguities.push({
            id: `amb-unit-${obsId}`,
            type: 'MISSING_UNIT',
            severity: 'action_required',
            field_location: `OBX-6 (Index ${idx})`,
            title: `Missing Unit for ${displayName}`,
            message: `Observation has value '${rawVal}' but OBX-6 unit is empty. Clinical informaticist verification required.`,
            suggested_options: candidates,
            default_choice: defaultUnit,
            target_resource_id: obsId,
            target_property_path: 'valueQuantity.unit',
            is_resolved: false,
          });
          this.recordConfidence('low');
        }
      } else if (unitVal && validateUcum(unitVal)) {
        this.recordConfidence('high');
      }

      // Value Mapping (Quantity vs String)
      if (valueType === 'NM') {
        const numVal = parseFloat(rawVal);
        if (!Number.isNaN(numVal) && rawVal.trim() !== '') {
          observation.valueQuantity = { value: numVal, unit: unitVal, system: 'http://unitsofmeasure.org', code: unitVal };
        } else {
          observation.valueString = rawVal;
        }
      } else {
        observation.valueString = rawVal;
      }

      // Interpretation / Abnormal Flags (OBX-8)
      const interp = mapObservationInterpretation(rawFlag);
      if (interp.length) {
        observation.interpretation = interp;
      }

      // Reference Range (OBX-7)
      if (rawRefRange) {
        observation.referenceRange = [{ text: rawRefRange }];
      }

      this.lineage.push({
        fhir_path: `Observation[${obsId}]`,
        hl7_source: `OBX (Index ${idx})`,
        confidence: isGrounded && unitVal ? 'high' : 'medium',
      });
      observations.push(observation);
    });

    // Map OBR to DiagnosticReport
    if (obrSegs.length) {
      for (const obr of obrSegs) {
        const fields = fieldsByIndex(obr);
        const rptId = `rpt-${uuidHex(8)}`;

        const serviceRaw = fields[4]?.raw_value ?? 'Diagnostic Report';
        let serviceCode = '24323-8', serviceDisplay = 'Comprehensive Metabolic Panel';
        if (serviceRaw.includes('^')) {
          const sParts = serviceRaw.split('^');
          serviceCode = sParts[0];
          serviceDisplay = sParts.length > 1 ? sParts[1] : serviceDisplay;
        }

        const notesText: string[] = [];
        for (const nte of nteSegs) {
          const nteFields = fieldsByIndex(nte);
          const comment = nteFields[3]?.raw_value ?? '';
          if (comment) notesText.push(comment);
        }

        const report: any = {
          resourceType: 'DiagnosticReport',
          id: rptId,
          status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code: serviceCode, display: serviceDisplay }], text: serviceDisplay },
          subject: { reference: this.patientUrn },
          encounter: { reference: this.encounterUrn },
          result: obsUrnMap.map((urn) => ({ reference: urn })),
        };

        if (notesText.length) {
          report.conclusion = notesText.join(' \n');
        }

        if (zdsSeg) {
          const zdsFields = fieldsByIndex(zdsSeg);
          const studyUid = zdsFields[2]?.raw_value ?? '1.2.840.unknown';
          const modality = zdsFields[3]?.raw_value ?? 'CR';
          const room = zdsFields[5]?.raw_value ?? '';

          report.extension = [
            {
              url: 'http://example.org/fhir/StructureDefinition/dicom-study-meta',
              extension: [
                { url: 'studyInstanceUid', valueString: studyUid },
                { url: 'modality', valueCode: modality },
                { url: 'imagingRoom', valueString: room },
              ],
            },
          ];
          this.ambiguities.push({
            id: `amb-zds-${uuidHex(6)}`,
            type: 'CUSTOM_Z_SEGMENT',
            severity: 'info',
            field_location: 'ZDS',
            title: 'Proprietary DICOM Study Segment (ZDS) Mapped',
            message: `Hospital DICOM Study UID '${studyUid}' and Modality '${modality}' mapped to DiagnosticReport extension.`,
            target_resource_id: rptId,
          });
          this.recordConfidence('medium');
        }

        this.lineage.push({ fhir_path: `DiagnosticReport[${rptId}]`, hl7_source: 'OBR', confidence: 'high' });
        this.recordConfidence('high');
        reports.push(report);
      }
    }

    return { observations, reports };
  }

  mapConditionsAndCoverage(dg1Segs: HL7Segment[], in1Segs: HL7Segment[]): { conditions: any[]; coverages: any[] } {
    const conditions: any[] = [];
    const coverages: any[] = [];

    for (const dg of dg1Segs) {
      const fields = fieldsByIndex(dg);
      const diagRaw = fields[3]?.raw_value ?? 'R69^Illness, unspecified';
      let code = 'J18.9', display = 'Pneumonia, unspecified organism';
      if (diagRaw.includes('^')) {
        const p = diagRaw.split('^');
        code = p[0];
        display = p.length > 1 ? p[1] : display;
      }

      const condId = `cond-${uuidHex(8)}`;
      const condition = {
        resourceType: 'Condition',
        id: condId,
        meta: { profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition'] },
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }] }],
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
        code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code, display }], text: display },
        subject: { reference: this.patientUrn },
        encounter: { reference: this.encounterUrn },
      };
      this.lineage.push({ fhir_path: `Condition[${condId}]`, hl7_source: 'DG1-3', confidence: 'high' });
      this.recordConfidence('high');
      conditions.push(condition);
    }

    for (const in1 of in1Segs) {
      const fields = fieldsByIndex(in1);
      const planName = fields[4]?.raw_value ?? 'Health Insurance Plan';
      const policyNum = fields[36]?.raw_value ?? 'POL-DEFAULT';

      const covId = `cov-${uuidHex(8)}`;
      const coverage = {
        resourceType: 'Coverage',
        id: covId,
        status: 'active',
        beneficiary: { reference: this.patientUrn },
        payor: [{ display: planName }],
        subscriberId: policyNum,
      };
      this.lineage.push({ fhir_path: `Coverage[${covId}]`, hl7_source: 'IN1', confidence: 'high' });
      this.recordConfidence('high');
      coverages.push(coverage);
    }

    return { conditions, coverages };
  }

  buildBundle(parsedMessage: { segments: HL7Segment[] }, vault: TokenVault): {
    bundle: any;
    rehydrated_bundle: any;
    confidence_score: number;
    confidence_counts: Record<string, number>;
    resource_confidences: Record<string, ResourceConfidence>;
    ambiguities: AmbiguityFlag[];
    lineage: MappingLineage[];
    total_resources: number;
    resource_types: string[];
  } {
    const segments = parsedMessage.segments || [];
    const mshSeg = segments.find((s) => s.segment_id === 'MSH');
    const pidSeg = segments.find((s) => s.segment_id === 'PID');
    const pv1Seg = segments.find((s) => s.segment_id === 'PV1');
    const nk1Segs = segments.filter((s) => s.segment_id === 'NK1');
    const obrSegs = segments.filter((s) => s.segment_id === 'OBR');
    const obxSegs = segments.filter((s) => s.segment_id === 'OBX');
    const nteSegs = segments.filter((s) => s.segment_id === 'NTE');
    const dg1Segs = segments.filter((s) => s.segment_id === 'DG1');
    const in1Segs = segments.filter((s) => s.segment_id === 'IN1');
    const zdsSeg = segments.find((s) => s.segment_id === 'ZDS');
    const ztrSeg = segments.find((s) => s.segment_id === 'ZTR');

    const resources: any[] = [];

    // Facility from MSH-4
    this.facility = '*';
    if (mshSeg) {
      const mshFields = fieldsByIndex(mshSeg);
      this.facility = mshFields[4]?.raw_value || '*';
    }

    if (pidSeg) {
      const patient = this.mapPatient(pidSeg, nk1Segs);
      resources.push(patient);
    }

    if (pv1Seg) {
      const encounter = this.mapEncounter(pv1Seg, ztrSeg);
      resources.push(encounter);
    }

    const { observations, reports } = this.mapObservationsAndReports(obrSegs, obxSegs, nteSegs, zdsSeg);
    resources.push(...observations);
    resources.push(...reports);

    const { conditions, coverages } = this.mapConditionsAndCoverage(dg1Segs, in1Segs);
    resources.push(...conditions);
    resources.push(...coverages);

    // 5. Extract structured entities from unstructured NTE clinical notes (Clinical NLP)
    nteSegs.forEach((nte, nIdx0) => {
      const nIdx = nIdx0 + 1;
      const nFields = fieldsByIndex(nte);
      const nteComment = nFields[3]?.raw_value ?? '';
      if (nteComment) {
        const extractedEntities = extractEntitiesFromNte(
          nteComment,
          this.patientUrn,
          this.encounterUrn,
          `NTE-3 (Index ${nIdx})`
        );
        for (const ent of extractedEntities) {
          resources.push(ent.fhir_resource);
          this.lineage.push({
            fhir_path: `${ent.fhir_resource.resourceType}[${ent.fhir_resource.id}]`,
            hl7_source: `NTE-3 (Index ${nIdx})`,
            confidence: 'high',
          });
          this.recordConfidence('high');
        }
      }
    });

    let mshTs = '';
    if (mshSeg) {
      const mshFields = fieldsByIndex(mshSeg);
      mshTs = parseHl7Datetime(mshFields[7]?.raw_value ?? '');
    }

    const bundleId = `bundle-${uuidHex(8)}`;
    const bundle: any = {
      resourceType: 'Bundle',
      id: bundleId,
      type: 'transaction',
      timestamp: mshTs || new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      entry: resources.map((r) => ({
        fullUrl: `urn:uuid:${r.id}`,
        resource: r,
        request: { method: 'POST', url: r.resourceType },
      })),
    };

    const totalChecks = Object.values(this.confidenceCounts).reduce((a, b) => a + b, 0) || 1;
    const confidencePercent = Math.round(
      ((this.confidenceCounts.high * 1.0 + this.confidenceCounts.medium * 0.75 + this.confidenceCounts.low * 0.4) / totalChecks) * 100
    );

    const resourceConfidences: Record<string, ResourceConfidence> = {};
    for (const r of resources) {
      const rid = r.id;
      const rAmbs = this.ambiguities.filter((a) => a.target_resource_id === rid);
      const hasAction = rAmbs.some((a) => a.severity === 'action_required' && !a.is_resolved);
      const hasWarning = rAmbs.some((a) => a.severity === 'warning' && !a.is_resolved);

      let rScore: number, rLevel: 'high' | 'medium' | 'low', rReason: string;
      if (hasAction) {
        rScore = 65;
        rLevel = 'low';
        rReason = 'Action Required (e.g. missing unit of measure)';
      } else if (hasWarning) {
        rScore = 80;
        rLevel = 'medium';
        rReason = 'Needs Review (inferred terminology or Z-segment extension)';
      } else {
        rScore = 98;
        rLevel = 'high';
        rReason = 'High Confidence (deterministic standard mapping)';
      }

      resourceConfidences[rid] = {
        resource_id: rid,
        resource_type: r.resourceType,
        score: rScore,
        level: rLevel,
        reason: rReason,
        ambiguity_ids: rAmbs.map((a) => a.id),
      };
    }

    return {
      bundle,
      rehydrated_bundle: vault.rehydrateData(bundle),
      confidence_score: confidencePercent,
      confidence_counts: this.confidenceCounts,
      resource_confidences: resourceConfidences,
      ambiguities: this.ambiguities,
      lineage: this.lineage,
      total_resources: resources.length,
      resource_types: Array.from(new Set(resources.map((r) => r.resourceType))),
    };
  }
}
