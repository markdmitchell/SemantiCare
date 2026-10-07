// Samples are assembled by field number so positions stay exact.
function seg(name: string, fields: Record<number, string>): string {
  const max = Math.max(...Object.keys(fields).map(Number));
  const out: string[] = [];
  for (let i = 1; i <= max; i++) out.push(fields[i] ?? "");
  return [name, ...out].join("|");
}
const msh = (type: string, ctrl: string, app: string) =>
  "MSH|^~\\&|" + [app, "MERCY_HOSP", "SYNAPSE", "HIE", "20260312084500", "", type, ctrl, "P", "2.5.1"].join("|");

const PID = seg("PID", {
  1: "1",
  3: "884213^^^MERCY^MR~123-45-6789^^^SSA^SS",
  5: "REYES^MARIA^ELENA",
  7: "19780422",
  8: "F",
  11: "1420 ELM ST^APT 3^SPRINGFIELD^IL^62704^USA",
  13: "(217)555-0198",
  16: "M",
  18: "ACCT77812",
  19: "123-45-6789",
});
const DOC = "1043^HALVERSON^JAMES^^^DR";

export const SAMPLES = {
  ADT: [
    msh("ADT^A01^ADT_A01", "MSG00001", "EPIC"),
    seg("EVN", { 1: "A01", 2: "20260312084500" }),
    PID,
    seg("NK1", { 1: "1", 2: "REYES^CARLOS", 3: "SPO^Spouse^HL70063", 4: "1420 ELM ST^APT 3^SPRINGFIELD^IL^62704", 5: "(217)555-0142" }),
    seg("PV1", { 1: "1", 2: "I", 3: "4WEST^412^B^MERCY", 7: DOC, 10: "MED", 17: DOC, 19: "V99812", 44: "20260312083000" }),
  ].join("\n"),
  ORU: [
    msh("ORU^R01^ORU_R01", "LAB4471", "LABSYS"),
    PID,
    seg("OBR", { 1: "1", 2: "ORD5521", 3: "FIL8890", 4: "BMP^Basic Metabolic Panel^L", 7: "20260312093000", 16: DOC, 22: "20260312101000", 25: "F" }),
    seg("OBX", { 1: "1", 2: "NM", 3: "GLU^Glucose^L", 5: "142", 6: "mg/dl", 7: "70-99", 8: "H", 11: "F", 14: "20260312093000" }),
    seg("OBX", { 1: "2", 2: "NM", 3: "NA^Sodium^L", 5: "138", 6: "mmol/l", 7: "135-145", 8: "N", 11: "F", 14: "20260312093000" }),
    seg("OBX", { 1: "3", 2: "NM", 3: "K^Potassium^L", 5: "4.1", 6: "mEq/L", 7: "3.5-5.1", 8: "N", 11: "F", 14: "20260312093000" }),
    seg("OBX", { 1: "4", 2: "NM", 3: "CREAT^Creatinine^L", 5: "1.02", 6: "mg/dl", 7: "0.57-1.00", 8: "H", 11: "F", 14: "20260312093000" }),
    seg("OBX", { 1: "5", 2: "NM", 3: "BUNX^Urea nitrogen^L", 5: "18", 6: "MG/DL", 7: "6-20", 8: "N", 11: "F", 14: "20260312093000" }),
    seg("OBX", { 1: "6", 2: "NM", 3: "HBA1C^Hemoglobin A1c^L", 5: "7.2", 6: "pct", 7: "<5.7", 8: "H", 11: "F", 14: "20260312093000" }),
    seg("NTE", { 1: "1", 3: "Results reviewed with REYES, MARIA by phone (217)555-0198." }),
  ].join("\n"),
  MDM: [
    msh("MDM^T02^MDM_T02", "DOC2201", "DICTATE"),
    seg("EVN", { 1: "T02", 2: "20260312150000" }),
    PID,
    seg("PV1", { 1: "1", 2: "I", 3: "4WEST^412^B^MERCY", 7: DOC, 44: "20260312083000" }),
    seg("TXA", { 1: "1", 2: "DCSUM^Discharge Summ^L", 3: "TX", 4: "20260312143000", 5: DOC, 12: "DOC-55120", 17: "AU" }),
    seg("OBX", { 1: "1", 2: "TX", 3: "NOTE^Narrative^L", 5: "Maria Reyes (MRN 884213) is a 47 y/o female admitted for hyperglycemia.", 11: "F" }),
    seg("OBX", { 1: "2", 2: "TX", 3: "NOTE^Narrative^L", 5: "Discharged on metformin 500 mg BID. Follow up call to (217)555-0198 in 1 week.", 11: "F" }),
  ].join("\n"),
} as const;

export type SampleKey = keyof typeof SAMPLES;
