import { findAll, findSeg, get, type HL7Message } from "./parser";

export const LOINC = "http://loinc.org";
export const UCUM = "http://unitsofmeasure.org";

export interface Candidate {
  code: string;
  display: string;
  system: string;
  confidence: number;
  note?: string;
  unit?: string;
}
export type AmbiguityKind = "code" | "unit" | "doctype";
export interface Ambiguity {
  id: string;
  kind: AmbiguityKind;
  location: string;
  source: string;
  context: string;
  rationale: string;
  candidates: Candidate[];
}
export type Resolutions = Record<string, number>; // index into candidates; -1 = keep source as-is
export type GroundStatus = "auto" | "resolved" | "pending" | "declined" | "none";

export interface ObsGrounding {
  segIndex: number;
  setId: string;
  valueType: string;
  localCode: string;
  localText: string;
  localSystem: string;
  value: string;
  rawUnit: string;
  refRange: string;
  flag: string;
  resultStatus: string;
  observedAt: string;
  concept?: Candidate;
  codeStatus: GroundStatus;
  ucum?: string;
  unitStatus: GroundStatus;
}
export interface DocGrounding {
  localCode: string;
  localText: string;
  concept?: Candidate;
  status: GroundStatus;
}
export interface GroundingResult {
  observations: ObsGrounding[];
  panel?: Candidate;
  doc?: DocGrounding;
  ambiguities: Ambiguity[];
}

type C = Omit<Candidate, "confidence" | "system">;
const LAB: { keys: string[]; options: C[] }[] = [
  {
    keys: ["GLU", "GLUC", "GLUCOSE"],
    options: [
      { code: "2345-7", display: "Glucose [Mass/volume] in Serum or Plasma", unit: "mg/dL", note: "Venous draw, serum/plasma" },
      { code: "2339-0", display: "Glucose [Mass/volume] in Blood", unit: "mg/dL", note: "Whole blood specimen" },
      { code: "41653-7", display: "Glucose [Mass/volume] in Capillary blood by Glucometer", unit: "mg/dL", note: "Point-of-care fingerstick" },
    ],
  },
  { keys: ["NA", "SODIUM"], options: [{ code: "2951-2", display: "Sodium [Moles/volume] in Serum or Plasma", unit: "mmol/L" }] },
  { keys: ["K", "POTASSIUM"], options: [{ code: "2823-3", display: "Potassium [Moles/volume] in Serum or Plasma", unit: "mmol/L" }] },
  { keys: ["CL", "CHLORIDE"], options: [{ code: "2075-0", display: "Chloride [Moles/volume] in Serum or Plasma", unit: "mmol/L" }] },
  { keys: ["CO2"], options: [{ code: "2028-9", display: "Carbon dioxide, total [Moles/volume] in Serum or Plasma", unit: "mmol/L" }] },
  { keys: ["CREAT", "CR"], options: [{ code: "2160-0", display: "Creatinine [Mass/volume] in Serum or Plasma", unit: "mg/dL" }] },
  { keys: ["BUN"], options: [{ code: "3094-0", display: "Urea nitrogen [Mass/volume] in Serum or Plasma", unit: "mg/dL" }] },
  { keys: ["CA", "CALCIUM"], options: [{ code: "17861-6", display: "Calcium [Mass/volume] in Serum or Plasma", unit: "mg/dL" }] },
  { keys: ["HBA1C", "A1C"], options: [{ code: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood", unit: "%" }] },
  { keys: ["HGB"], options: [{ code: "718-7", display: "Hemoglobin [Mass/volume] in Blood", unit: "g/dL" }] },
  { keys: ["WBC"], options: [{ code: "6690-2", display: "Leukocytes [#/volume] in Blood by Automated count", unit: "10*3/uL" }] },
];
const PANELS: Record<string, C> = {
  BMP: { code: "51990-0", display: "Basic metabolic panel - Blood" },
  CMP: { code: "24323-8", display: "Comprehensive metabolic 2000 panel - Serum or Plasma" },
  CBC: { code: "58410-2", display: "CBC panel - Blood by Automated count" },
};
const DOC_TYPES: { keys: string[]; opt: C }[] = [
  { keys: ["DS", "DISCHARGE"], opt: { code: "18842-5", display: "Discharge summary" } },
  { keys: ["PN", "PROGRESS"], opt: { code: "11506-3", display: "Progress note" } },
  { keys: ["HP", "H&P"], opt: { code: "34117-2", display: "History and physical note" } },
  { keys: ["CN", "CONSULT"], opt: { code: "11488-4", display: "Consult note" } },
  { keys: ["OP"], opt: { code: "11504-8", display: "Surgical operation note" } },
];
const UNITS: Record<string, string> = {
  "mg/dl": "mg/dL",
  "mmol/l": "mmol/L",
  "meq/l": "meq/L",
  "g/dl": "g/dL",
  "%": "%",
  "k/ul": "10*3/uL",
  "10^3/ul": "10*3/uL",
  mmhg: "mm[Hg]",
  bpm: "/min",
  "u/l": "U/L",
  "ng/ml": "ng/mL",
  "ml/min/1.73m2": "mL/min/{1.73_m2}",
};

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
function fuzzy(text: string, pool: C[]): Candidate[] {
  const w = words(text);
  if (!w.length) return [];
  return pool
    .map((o) => {
      const d = words(o.display);
      const hits = w.filter((x) => d.some((y) => y.startsWith(x) || x.startsWith(y))).length;
      return { ...o, system: LOINC, confidence: Math.round((hits / w.length) * 0.85 * 100) / 100 };
    })
    .filter((c) => c.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

function apply(amb: Ambiguity, res: Resolutions): { pick?: Candidate; status: GroundStatus } {
  const r = res[amb.id];
  if (r === undefined) return { status: "pending" };
  if (r < 0) return { status: "declined" };
  return { pick: amb.candidates[r], status: "resolved" };
}

export function ground(msg: HL7Message, res: Resolutions): GroundingResult {
  const ambiguities: Ambiguity[] = [];
  const observations: ObsGrounding[] = [];
  const allLab = LAB.flatMap((l) => l.options);

  msg.segments.forEach((seg, segIndex) => {
    if (seg.name !== "OBX") return;
    const setId = get(seg, 1) || String(observations.length + 1);
    const o: ObsGrounding = {
      segIndex,
      setId,
      valueType: get(seg, 2),
      localCode: get(seg, 3, 1),
      localText: get(seg, 3, 2),
      localSystem: get(seg, 3, 3),
      value: get(seg, 5),
      rawUnit: get(seg, 6),
      refRange: get(seg, 7),
      flag: get(seg, 8),
      resultStatus: get(seg, 11),
      observedAt: get(seg, 14),
      codeStatus: "none",
      unitStatus: "none",
    };
    const loc = `OBX[${setId}]`;
    if (msg.type === "MDM" && ["TX", "FT"].includes(o.valueType)) {
      observations.push(o);
      return; // narrative body, consumed by DocumentReference
    }

    // ---- Code grounding
    if (o.localSystem === "LN") {
      o.concept = { code: o.localCode, display: o.localText, system: LOINC, confidence: 1 };
      o.codeStatus = "auto";
    } else {
      const entry = LAB.find((l) => l.keys.includes(o.localCode.toUpperCase()));
      if (entry && entry.options.length === 1) {
        o.concept = { ...entry.options[0], system: LOINC, confidence: 0.98 };
        o.codeStatus = "auto";
      } else {
        const candidates = entry
          ? entry.options.map((c, i) => ({ ...c, system: LOINC, confidence: [0.62, 0.27, 0.11][i] ?? 0.05 }))
          : fuzzy(o.localText, allLab);
        const amb: Ambiguity = {
          id: `${loc}-code`,
          kind: "code",
          location: `${loc} · OBX-3`,
          source: `${o.localCode}^${o.localText}`,
          context: `Value ${o.value} ${o.rawUnit}`.trim(),
          rationale: entry
            ? `Local code "${o.localCode}" maps to ${candidates.length} LOINC concepts that differ by specimen. No SPM/OBR-15 specimen source is present to disambiguate.`
            : `Local code "${o.localCode}" is not in the mapping table. Candidates were proposed by lexical match on "${o.localText}".`,
          candidates,
        };
        ambiguities.push(amb);
        const r = apply(amb, res);
        o.concept = r.pick;
        o.codeStatus = r.status;
      }
    }

    // ---- Unit grounding
    if (o.rawUnit) {
      const hit = UNITS[o.rawUnit.toLowerCase()];
      if (hit) {
        o.ucum = hit;
        o.unitStatus = "auto";
      } else {
        const expected = o.concept?.unit ?? LAB.find((l) => l.keys.includes(o.localCode.toUpperCase()))?.options[0]?.unit;
        const candidates: Candidate[] = [];
        if (expected)
          candidates.push({ code: expected, display: expected, system: UCUM, confidence: 0.81, note: `Canonical unit for ${o.concept?.code ?? "the likely concept"}` });
        candidates.push({ code: `{${o.rawUnit}}`, display: `{${o.rawUnit}}`, system: UCUM, confidence: 0.35, note: "Preserve source string as a UCUM annotation (non-computable)" });
        const amb: Ambiguity = {
          id: `${loc}-unit`,
          kind: "unit",
          location: `${loc} · OBX-6`,
          source: o.rawUnit,
          context: `${o.localText}: ${o.value} ${o.rawUnit} (ref ${o.refRange || "n/a"})`,
          rationale: `"${o.rawUnit}" is not a valid UCUM expression. A wrong choice changes clinical meaning, so a human must confirm.`,
          candidates,
        };
        ambiguities.push(amb);
        const r = apply(amb, res);
        o.ucum = r.pick?.code;
        o.unitStatus = r.status;
      }
    }
    observations.push(o);
  });

  const obr = findSeg(msg, "OBR");
  const panelLocal = obr ? get(obr, 4, 1).toUpperCase() : "";
  const panel = PANELS[panelLocal] ? { ...PANELS[panelLocal], system: LOINC, confidence: 0.97 } : undefined;

  let doc: DocGrounding | undefined;
  const txa = findAll(msg, "TXA")[0];
  if (txa) {
    const localCode = get(txa, 2, 1);
    const localText = get(txa, 2, 2);
    const known = DOC_TYPES.find((d) => d.keys.includes(localCode.toUpperCase()));
    if (known) doc = { localCode, localText, concept: { ...known.opt, system: LOINC, confidence: 0.97 }, status: "auto" };
    else {
      const amb: Ambiguity = {
        id: "TXA-type",
        kind: "doctype",
        location: "TXA[1] · TXA-2",
        source: `${localCode}^${localText}`,
        context: "Document type drives US Core DocumentReference.type",
        rationale: `Local document type "${localCode}" has no direct mapping. Proposed from the description "${localText}".`,
        candidates: (() => {
          const pool = DOC_TYPES.map((d) => d.opt);
          const f = fuzzy(localText, pool);
          return f.length ? f : pool.map((p) => ({ ...p, system: LOINC, confidence: 0.1 }));
        })(),
      };
      ambiguities.push(amb);
      const r = apply(amb, res);
      doc = { localCode, localText, concept: r.pick, status: r.status };
    }
  }

  return { observations, panel, doc, ambiguities };
}
