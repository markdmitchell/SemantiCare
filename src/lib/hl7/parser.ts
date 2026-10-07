export type FieldValue = string[][][]; // repetitions -> components -> subcomponents
export interface Segment {
  name: string;
  fields: FieldValue[]; // indexed by HL7 field number (fields[0] unused)
  line: number;
}
export interface Encoding {
  field: string;
  comp: string;
  rep: string;
  esc: string;
  sub: string;
}
export interface HL7Message {
  segments: Segment[];
  enc: Encoding;
  type: string;
  trigger: string;
  controlId: string;
  version: string;
  errors: string[];
  warnings: string[];
}

const DEFAULT_ENC: Encoding = { field: "|", comp: "^", rep: "~", esc: "\\", sub: "&" };

function parseField(p: string, enc: Encoding): FieldValue {
  if (p === "") return [[[""]]];
  return p.split(enc.rep).map((r) => r.split(enc.comp).map((c) => c.split(enc.sub)));
}

const REQUIRED: Record<string, string[]> = {
  ADT: ["EVN", "PID", "PV1"],
  ORU: ["PID", "OBR", "OBX"],
  MDM: ["EVN", "PID", "PV1", "TXA"],
};

export function parseHL7(raw: string): HL7Message {
  const lines = raw
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: string[] = [];
  const warnings: string[] = [];
  let enc = { ...DEFAULT_ENC };
  if (!lines.length) {
    return { segments: [], enc, type: "", trigger: "", controlId: "", version: "", errors: ["Empty message"], warnings };
  }
  if (!lines[0].startsWith("MSH")) errors.push("First segment must be MSH");
  else {
    const f = lines[0][3] ?? "|";
    const end = lines[0].indexOf(f, 4);
    const e = lines[0].slice(4, end === -1 ? undefined : end);
    enc = { field: f, comp: e[0] ?? "^", rep: e[1] ?? "~", esc: e[2] ?? "\\", sub: e[3] ?? "&" };
  }
  const segments: Segment[] = lines.map((line, i) => {
    const parts = line.split(enc.field);
    const name = parts[0];
    if (!/^[A-Z][A-Z0-9]{2}$/.test(name)) errors.push(`Line ${i + 1}: invalid segment id "${name}"`);
    const fields: FieldValue[] = [[]];
    if (name === "MSH") {
      fields[1] = [[[enc.field]]];
      fields[2] = [[[parts[1] ?? ""]]];
      parts.slice(2).forEach((p) => fields.push(parseField(p, enc)));
    } else parts.slice(1).forEach((p) => fields.push(parseField(p, enc)));
    return { name, fields, line: i + 1 };
  });
  const msh = segments[0];
  const type = get(msh, 9, 1);
  const msg: HL7Message = {
    segments,
    enc,
    type,
    trigger: get(msh, 9, 2),
    controlId: get(msh, 10),
    version: get(msh, 12),
    errors,
    warnings,
  };
  if (!msg.controlId) warnings.push("MSH-10 message control ID is empty");
  for (const req of REQUIRED[type] ?? []) {
    if (!segments.some((s) => s.name === req)) warnings.push(`${type} message is missing expected ${req} segment`);
  }
  if (type && !REQUIRED[type]) warnings.push(`Message type ${type} is not one of ADT / ORU / MDM`);
  return msg;
}

export function get(seg: Segment | undefined, f: number, c = 1, r = 1, s = 1): string {
  return seg?.fields[f]?.[r - 1]?.[c - 1]?.[s - 1] ?? "";
}
export function reps(seg: Segment | undefined, f: number): string[][][] {
  const fv = seg?.fields[f];
  if (!fv) return [];
  return fv.filter((r) => r.some((c) => c.some((s) => s !== "")));
}
export const findSeg = (m: HL7Message, name: string) => m.segments.find((s) => s.name === name);
export const findAll = (m: HL7Message, name: string) => m.segments.filter((s) => s.name === name);

export function serializeField(fv: FieldValue, enc: Encoding): string {
  return fv.map((r) => r.map((c) => c.join(enc.sub)).join(enc.comp)).join(enc.rep);
}
export function serializeSegment(seg: Segment, enc: Encoding): string {
  if (seg.name === "MSH") {
    const rest = seg.fields.slice(3).map((f) => serializeField(f, enc));
    return ["MSH", seg.fields[2]?.[0]?.[0]?.[0] ?? "", ...rest].join(enc.field);
  }
  return [seg.name, ...seg.fields.slice(1).map((f) => serializeField(f, enc))].join(enc.field);
}
export function serialize(m: HL7Message): string {
  return m.segments.map((s) => serializeSegment(s, m.enc)).join("\n");
}
