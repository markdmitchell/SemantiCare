import type { Bundle, Resource } from "./fhir";
import { LOINC, UCUM } from "./terminology";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Severity = "error" | "warning" | "info";
export interface Issue {
  severity: Severity;
  resource: string;
  path: string;
  message: string;
  rule: string;
}

const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const DATETIME = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function validateBundle(b: Bundle): Issue[] {
  const issues: Issue[] = [];
  const urls = new Set(b.entry.map((e) => e.fullUrl));

  for (const e of b.entry) {
    const r = e.resource;
    const label = `${r.resourceType}/${r.id?.slice(0, 8)}`;
    const push = (severity: Severity, path: string, message: string, rule: string) =>
      issues.push({ severity, resource: label, path: `${r.resourceType}.${path}`, message, rule });
    const req = (path: string, v: unknown, rule: string) => {
      if (v === undefined || v === null || (Array.isArray(v) && !v.length)) push("error", path, `${path} is required (min 1)`, rule);
    };
    const ref = (path: string, v: any, rule: string) => {
      if (v?.reference && !urls.has(v.reference)) push("error", path, `Reference ${v.reference} does not resolve within the Bundle`, rule);
    };
    const profile = r.meta?.profile?.[0] as string | undefined;
    if (!profile) push("warning", "meta.profile", "No US Core profile declared", "us-core");
    const code = (path: string, cc: any, rule: string, sev: Severity = "error") => {
      const ok = cc?.coding?.some((c: any) => c.system === LOINC && c.code);
      if (!ok) push(sev, path, `${path} has no LOINC coding (only local code "${cc?.coding?.[0]?.code ?? "?"}")`, rule);
    };

    switch (r.resourceType) {
      case "Patient": {
        const rule = "us-core-patient";
        req("identifier", r.identifier, rule);
        r.identifier?.forEach((id: any, i: number) => {
          if (!id.system) push("error", `identifier[${i}].system`, "identifier.system is required", rule);
          if (!id.value) push("error", `identifier[${i}].value`, "identifier.value is required", rule);
        });
        req("name", r.name, rule);
        r.name?.forEach((n: any, i: number) => {
          if (!n.family && !n.given?.length) push("error", `name[${i}]`, "us-core-8: Patient.name.given or Patient.name.family or both SHALL be present", rule);
        });
        req("gender", r.gender, rule);
        if (r.gender && !["male", "female", "other", "unknown"].includes(r.gender)) push("error", "gender", `Invalid gender code "${r.gender}"`, rule);
        if (r.birthDate && !DATE.test(r.birthDate)) push("error", "birthDate", `birthDate "${r.birthDate}" is not a valid FHIR date`, rule);
        if (!r.birthDate) push("warning", "birthDate", "birthDate is Must Support", rule);
        if (!r.extension?.some((x: any) => /us-core-race/.test(x.url))) push("info", "extension:race", "US Core Race extension (Must Support) not available from HL7 PID-10", rule);
        if (!r.extension?.some((x: any) => /us-core-ethnicity/.test(x.url))) push("info", "extension:ethnicity", "US Core Ethnicity extension (Must Support) not available from HL7 PID-22", rule);
        if (!r.communication) push("info", "communication", "communication.language is Must Support", rule);
        break;
      }
      case "Practitioner": {
        const rule = "us-core-practitioner";
        req("identifier", r.identifier, rule);
        req("name", r.name, rule);
        if (!r.identifier?.some((i: any) => i.system === "http://hl7.org/fhir/sid/us-npi"))
          push("warning", "identifier:NPI", "NPI identifier slice is Must Support; source only supplied a local provider ID", rule);
        break;
      }
      case "Encounter": {
        const rule = "us-core-encounter";
        req("status", r.status, rule);
        req("class", r.class, rule);
        req("type", r.type, rule);
        req("subject", r.subject, rule);
        ref("subject", r.subject, rule);
        if (r.status === "unknown") push("warning", "status", "Encounter status could not be derived from trigger event", rule);
        if (r.period?.start && !DATETIME.test(r.period.start)) push("error", "period.start", "Invalid dateTime", rule);
        break;
      }
      case "Observation": {
        const rule = "us-core-observation-lab";
        req("status", r.status, rule);
        if (r.status === "unknown") push("warning", "status", "OBX-11 result status missing or unmapped", rule);
        if (!r.category?.some((c: any) => c.coding?.some((x: any) => x.code === "laboratory")))
          push("error", "category", "category:Laboratory slice is required", rule);
        req("code", r.code, rule);
        code("code", r.code, rule);
        req("subject", r.subject, rule);
        ref("subject", r.subject, rule);
        if (!r.effectiveDateTime && !r.effectivePeriod) push("error", "effective[x]", "us-core-2: effective[x] SHALL be present if status is final", rule);
        else if (r.effectiveDateTime && !DATETIME.test(r.effectiveDateTime)) push("error", "effectiveDateTime", "Invalid dateTime", rule);
        const hasValue = Object.keys(r).some((k) => k.startsWith("value"));
        if (!hasValue && !r.dataAbsentReason) push("error", "value[x]", "us-core-2: value[x] or dataAbsentReason SHALL be present", rule);
        const vq = r.valueQuantity;
        if (vq) {
          if (vq.system !== UCUM || !vq.code)
            push("error", "valueQuantity", `Quantity unit "${vq.unit}" has no UCUM system/code (qty-3)`, rule);
          else if (/^\{.*\}$/.test(vq.code))
            push("warning", "valueQuantity.code", `UCUM annotation ${vq.code} is valid but not computable`, rule);
        }
        break;
      }
      case "DiagnosticReport": {
        const rule = "us-core-diagnosticreport-lab";
        req("status", r.status, rule);
        if (!r.category?.some((c: any) => c.coding?.some((x: any) => x.code === "LAB"))) push("error", "category", "category:LaboratorySlice (LAB) is required", rule);
        req("code", r.code, rule);
        code("code", r.code, rule, "warning");
        req("subject", r.subject, rule);
        ref("subject", r.subject, rule);
        if (!r.effectiveDateTime) push("error", "effective[x]", "effective[x] is required", rule);
        req("issued", r.issued, rule);
        if (r.issued && !INSTANT.test(r.issued)) push("error", "issued", "issued must be an instant with timezone", rule);
        r.result?.forEach((x: any, i: number) => ref(`result[${i}]`, x, rule));
        break;
      }
      case "DocumentReference": {
        const rule = "us-core-documentreference";
        req("status", r.status, rule);
        req("type", r.type, rule);
        code("type", r.type, rule);
        req("category", r.category, rule);
        req("subject", r.subject, rule);
        ref("subject", r.subject, rule);
        req("content", r.content, rule);
        r.content?.forEach((c: any, i: number) => {
          if (!c.attachment?.contentType) push("error", `content[${i}].attachment.contentType`, "us-core-6: contentType required", rule);
          if (!c.attachment?.data && !c.attachment?.url) push("error", `content[${i}].attachment`, "us-core-6: data or url SHALL be present", rule);
        });
        if (!r.date) push("warning", "date", "date is Must Support", rule);
        if (r.date && !INSTANT.test(r.date)) push("error", "date", "date must be an instant", rule);
        if (!r.author?.length) push("warning", "author", "author is Must Support", rule);
        break;
      }
    }
    // generic reference scan
    walk(r, (k, v) => {
      if (k === "reference" && typeof v === "string" && !urls.has(v))
        issues.push({ severity: "error", resource: label, path: "reference", message: `Dangling reference ${v}`, rule: "bundle" });
    });
  }
  if (!b.entry.some((e) => e.resource.resourceType === "Patient"))
    issues.push({ severity: "error", resource: "Bundle", path: "Bundle.entry", message: "No Patient resource could be produced (missing PID)", rule: "bundle" });
  // dedupe
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = i.resource + i.path + i.message;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function walk(o: any, fn: (k: string, v: unknown) => void) {
  if (!o || typeof o !== "object") return;
  for (const [k, v] of Object.entries(o)) {
    fn(k, v);
    walk(v, fn);
  }
}

export function score(issues: Issue[]): number {
  const e = issues.filter((i) => i.severity === "error").length;
  const w = issues.filter((i) => i.severity === "warning").length;
  return Math.max(0, 100 - e * 8 - w * 2);
}
export type { Resource };
