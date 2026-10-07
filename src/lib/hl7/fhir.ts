import { findAll, findSeg, get, reps, type HL7Message, type Segment } from "./parser";
import { LOINC, UCUM, type GroundingResult } from "./terminology";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Resource = { resourceType: string; id?: string; [k: string]: any };
export interface BundleEntry {
  fullUrl: string;
  resource: Resource;
  request: { method: "POST"; url: string };
}
export interface Bundle {
  resourceType: "Bundle";
  id: string;
  type: "transaction";
  timestamp?: string;
  entry: BundleEntry[];
}

const P = "http://hl7.org/fhir/us/core/StructureDefinition/";

function uuidFrom(seed: string): string {
  let h = "";
  for (let salt = 0; salt < 4; salt++) {
    let x = 0x811c9dc5 ^ salt;
    for (let i = 0; i < seed.length; i++) x = Math.imul(x ^ seed.charCodeAt(i), 0x01000193);
    h += (x >>> 0).toString(16).padStart(8, "0");
  }
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function hl7DateTime(ts: string): string | undefined {
  if (!ts) return undefined;
  const m = ts.match(/^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return ts; // vault token or unparseable — passed through
  const [, y, mo, d, h, mi, s] = m;
  if (!mo) return y;
  if (!d) return `${y}-${mo}`;
  if (!h) return `${y}-${mo}-${d}`;
  return `${y}-${mo}-${d}T${h}:${mi ?? "00"}:${s ?? "00"}+00:00`;
}
const hl7Date = (ts: string) => (ts ? (hl7DateTime(ts.slice(0, 8)) ?? ts) : undefined);

function prune<T>(v: T): T {
  if (Array.isArray(v)) return v.map(prune).filter((x) => x !== undefined && !(typeof x === "object" && x && Object.keys(x).length === 0)) as T;
  if (v && typeof v === "object") {
    const o: any = {};
    for (const [k, val] of Object.entries(v)) {
      const p = prune(val);
      if (p === undefined || p === "" || (Array.isArray(p) && !p.length) || (p && typeof p === "object" && !Array.isArray(p) && !Object.keys(p).length)) continue;
      o[k] = p;
    }
    return o;
  }
  return v;
}

const STATUS: Record<string, string> = { F: "final", P: "preliminary", C: "corrected", X: "cancelled", R: "registered", I: "registered" };
const GENDER: Record<string, string> = { F: "female", M: "male", O: "other", U: "unknown", A: "other", N: "unknown" };
const INTERP: Record<string, string> = { H: "H", L: "L", N: "N", A: "A", HH: "HH", LL: "LL" };

const address = (r: string[][]) => ({
  line: [r[0]?.[0], r[1]?.[0]].filter(Boolean),
  city: r[2]?.[0],
  state: r[3]?.[0],
  postalCode: r[4]?.[0],
  country: r[5]?.[0],
});
const humanName = (r: string[][]) => ({ use: "official", family: r[0]?.[0], given: [r[1]?.[0], r[2]?.[0]].filter(Boolean) });

export function buildBundle(msg: HL7Message, g: GroundingResult): Bundle {
  const seed = msg.controlId || "msg";
  const entry: BundleEntry[] = [];
  const add = (res: Resource): string => {
    const id = uuidFrom(`${seed}|${res.resourceType}|${entry.length}`);
    const r = prune({ ...res, id });
    entry.push({ fullUrl: `urn:uuid:${id}`, resource: r, request: { method: "POST", url: res.resourceType } });
    return `urn:uuid:${id}`;
  };

  // ---------- Patient
  const pid = findSeg(msg, "PID");
  let patientRef: string | undefined;
  if (pid) {
    const nk1s = findAll(msg, "NK1");
    patientRef = add({
      resourceType: "Patient",
      meta: { profile: [P + "us-core-patient"] },
      identifier: reps(pid, 3).map((r) => {
        const type = r[4]?.[0] ?? "";
        const auth = r[3]?.[0] ?? "local";
        return {
          use: type === "MR" ? "usual" : undefined,
          type: type ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: type }] } : undefined,
          system: type === "SS" ? "http://hl7.org/fhir/sid/us-ssn" : `urn:synapsehl7:${auth.toLowerCase()}:${type.toLowerCase() || "id"}`,
          value: r[0]?.[0],
        };
      }),
      name: reps(pid, 5).map(humanName),
      telecom: [
        ...reps(pid, 13).map((r) => ({ system: "phone", value: r[0]?.[0], use: "home" })),
        ...reps(pid, 14).map((r) => ({ system: "phone", value: r[0]?.[0], use: "work" })),
      ],
      gender: GENDER[get(pid, 8)] ?? (get(pid, 8) ? "unknown" : undefined),
      birthDate: hl7Date(get(pid, 7)),
      address: reps(pid, 11).map(address),
      maritalStatus: get(pid, 16)
        ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", code: get(pid, 16) }] }
        : undefined,
      contact: nk1s.map((n) => ({
        relationship: get(n, 3) ? [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0063", code: get(n, 3), display: get(n, 3, 2) }] }] : undefined,
        name: reps(n, 2).map(humanName)[0],
        telecom: reps(n, 5).map((r) => ({ system: "phone", value: r[0]?.[0] })),
        address: reps(n, 4).map(address)[0],
      })),
    });
  }
  const subject = patientRef ? { reference: patientRef } : undefined;

  // ---------- Practitioners (deduped by ID)
  const practitioners = new Map<string, string>();
  const practitioner = (seg: Segment | undefined, f: number) => {
    if (!seg || !get(seg, f, 1)) return undefined;
    const id = get(seg, f, 1);
    if (!practitioners.has(id)) {
      practitioners.set(
        id,
        add({
          resourceType: "Practitioner",
          meta: { profile: [P + "us-core-practitioner"] },
          identifier: [{ system: "urn:synapsehl7:provider-id", value: id }],
          name: [{ family: get(seg, f, 2), given: [get(seg, f, 3)].filter(Boolean), prefix: [get(seg, f, 6)].filter(Boolean) }],
        }),
      );
    }
    return { reference: practitioners.get(id)! };
  };

  // ---------- Encounter
  const pv1 = findSeg(msg, "PV1");
  let encounterRef: string | undefined;
  if (pv1) {
    const cls = get(pv1, 2);
    const CLASS: Record<string, [string, string, string, string]> = {
      I: ["IMP", "inpatient encounter", "32485007", "Hospital admission"],
      E: ["EMER", "emergency", "50849002", "Emergency room admission"],
      O: ["AMB", "ambulatory", "185349003", "Encounter for check up"],
    };
    const c = CLASS[cls];
    const attending = practitioner(pv1, 7);
    encounterRef = add({
      resourceType: "Encounter",
      meta: { profile: [P + "us-core-encounter"] },
      identifier: get(pv1, 19) ? [{ system: "urn:synapsehl7:visit", value: get(pv1, 19) }] : undefined,
      status: msg.trigger === "A03" ? "finished" : ["A01", "A04", "T02"].includes(msg.trigger) ? "in-progress" : "unknown",
      class: c ? { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: c[0], display: c[1] } : undefined,
      type: c ? [{ coding: [{ system: "http://snomed.info/sct", code: c[2], display: c[3] }] }] : undefined,
      subject,
      participant: attending ? [{ individual: attending }] : undefined,
      period: { start: hl7DateTime(get(pv1, 44) || get(findSeg(msg, "EVN"), 2)), end: hl7DateTime(get(pv1, 45)) },
      location: get(pv1, 3) ? [{ location: { display: reps(pv1, 3)[0].map((x) => x[0]).filter(Boolean).join(" / ") } }] : undefined,
    });
  }
  const encounter = encounterRef ? { reference: encounterRef } : undefined;

  // ---------- Observations + DiagnosticReport
  const obr = findSeg(msg, "OBR");
  if (msg.type !== "MDM") {
    const results: { reference: string }[] = [];
    for (const o of g.observations) {
      const local = { system: "urn:synapsehl7:local-lab", code: o.localCode, display: o.localText };
      const coding = o.concept ? [{ system: LOINC, code: o.concept.code, display: o.concept.display }, local] : [local];
      let value: Record<string, unknown> = {};
      if (o.valueType === "NM" && o.value !== "") {
        value = { valueQuantity: { value: Number(o.value), unit: o.rawUnit, system: o.ucum ? UCUM : undefined, code: o.ucum } };
      } else if (o.value) value = { valueString: o.value };
      const rr = o.refRange.match(/^\s*([\d.]+)\s*-\s*([\d.]+)\s*$/);
      const q = (v: string) => ({ value: Number(v), unit: o.rawUnit, system: o.ucum ? UCUM : undefined, code: o.ucum });
      results.push({
        reference: add({
          resourceType: "Observation",
          meta: { profile: [P + "us-core-observation-lab"] },
          status: STATUS[o.resultStatus] ?? "unknown",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory", display: "Laboratory" }] }],
          code: { coding, text: o.localText },
          subject,
          encounter,
          effectiveDateTime: hl7DateTime(o.observedAt || get(obr, 7)),
          ...value,
          dataAbsentReason: Object.keys(value).length ? undefined : { coding: [{ system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", code: "unknown" }] },
          interpretation: INTERP[o.flag]
            ? [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: INTERP[o.flag] }] }]
            : undefined,
          referenceRange: o.refRange ? [rr ? { low: q(rr[1]), high: q(rr[2]) } : { text: o.refRange }] : undefined,
        }),
      });
    }
    if (obr) {
      const local = { system: "urn:synapsehl7:local-panel", code: get(obr, 4, 1), display: get(obr, 4, 2) };
      add({
        resourceType: "DiagnosticReport",
        meta: { profile: [P + "us-core-diagnosticreport-lab"] },
        identifier: get(obr, 3) ? [{ system: "urn:synapsehl7:filler-order", value: get(obr, 3) }] : undefined,
        status: STATUS[get(obr, 25)] ?? "unknown",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", code: "LAB", display: "Laboratory" }] }],
        code: { coding: g.panel ? [{ system: LOINC, code: g.panel.code, display: g.panel.display }, local] : [local], text: get(obr, 4, 2) },
        subject,
        encounter,
        effectiveDateTime: hl7DateTime(get(obr, 7)),
        issued: hl7DateTime(get(obr, 22)),
        performer: [practitioner(obr, 16)].filter(Boolean),
        result: results,
      });
    }
  }

  // ---------- DocumentReference (MDM)
  const txa = findSeg(msg, "TXA");
  if (txa) {
    const text = msg.segments
      .filter((s) => s.name === "OBX" && ["TX", "FT"].includes(get(s, 2)))
      .map((s) => reps(s, 5).map((r) => r.map((c) => c.join(" ")).join(" ")).join("\n"))
      .join("\n");
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    const author = practitioner(txa, 5);
    const local = { system: "urn:synapsehl7:local-doctype", code: g.doc?.localCode, display: g.doc?.localText };
    const DOCSTATUS: Record<string, string> = { AU: "final", LA: "final", DO: "preliminary", IP: "preliminary", PA: "preliminary" };
    add({
      resourceType: "DocumentReference",
      meta: { profile: [P + "us-core-documentreference"] },
      identifier: get(txa, 12) ? [{ system: "urn:synapsehl7:document", value: get(txa, 12) }] : undefined,
      status: "current",
      docStatus: DOCSTATUS[get(txa, 17)],
      type: { coding: g.doc?.concept ? [{ system: LOINC, code: g.doc.concept.code, display: g.doc.concept.display }, local] : [local], text: g.doc?.localText },
      category: [{ coding: [{ system: "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category", code: "clinical-note", display: "Clinical Note" }] }],
      subject,
      date: hl7DateTime(get(txa, 4)),
      author: author ? [author] : undefined,
      content: [
        {
          attachment: { contentType: "text/plain; charset=utf-8", data: btoa(bin), title: g.doc?.localText },
          format: { system: "http://ihe.net/fhir/ValueSet/IHE.FormatCode.codesystem", code: "urn:ihe:iti:xds:2017:mimeTypeSufficient", display: "mimeType Sufficient" },
        },
      ],
      context: encounter ? { encounter: [encounter] } : undefined,
    });
  }

  return {
    resourceType: "Bundle",
    id: uuidFrom(seed + "|bundle"),
    type: "transaction",
    timestamp: hl7DateTime(get(msg.segments[0], 7)),
    entry,
  };
}
