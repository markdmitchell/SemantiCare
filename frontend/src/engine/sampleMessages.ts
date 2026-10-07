/**
 * Curated HL7 v2 Sample Messages (ported from app/samples/sample_messages.py)
 */
import type { HL7Sample } from '../types/hl7';

export const SAMPLE_MESSAGES: HL7Sample[] = [
  {
    id: 'adt-a01-admission',
    title: 'ADT^A01 - Inpatient Hospital Admission',
    category: 'Demographics & Encounter',
    description:
      'Standard adult admission containing Patient Demographics (PID), Next of Kin (NK1), Inpatient Visit (PV1), Admitting Diagnosis (DG1), and Insurance (IN1).',
    highlights: [
      'Structured Patient Name (Family^Given^Middle)',
      'Attending Physician (NPI / Provider ID)',
      'Inpatient Room & Bed Assignment',
      'Emergency Contact Relationship',
    ],
    raw:
      'MSH|^~\\&|EPIC_EHR|METRO_HEALTH|INTEGRATION_HUB|CENTRAL_HOSP|20261006143000||ADT^A01^ADT_A01|MSG20261006001|P|2.5.1|||AL|NE\r' +
      'EVN|A01|20261006143000|||DR_SMITH|20261006142500\r' +
      'PID|1||MRN987654321^^^METRO_HEALTH^MR||EVERGREEN^ELEANOR^CLAIRE||19840512|F||2106-3^White^CDCREC|452 COMMONWEALTH AVE^^BOSTON^MA^02215^USA||(617)555-0199||ENG|M||ACCT2026-9912|999-88-7777||2186-5^Not Hispanic or Latino^CDCREC\r' +
      'NK1|1|EVERGREEN^THOMAS^EDWARD|SPO^Spouse^HL70063|452 COMMONWEALTH AVE^^BOSTON^MA^02215^USA|(617)555-0198\r' +
      'PV1|1|I|MED^4WEST^402-A|EMER|||1234567890^RIVERA^CARLOS^M^DR^MD^^^NPI|9876543210^CHEN^WEI^DR^^^NPI||MED||||EMER|||V202600845|COMM|||||||||||||||||||||||||20261006142500\r' +
      'DG1|1|I10|J18.9^Pneumonia, unspecified organism|Pneumonia, unspecified|20261006143000|A\r' +
      'IN1|1|BCBS001|BCBS_MA^Blue Cross Blue Shield MA|BLUE CROSS BLUE SHIELD|PO BOX 1234^^BOSTON^MA^02101||||||||||PPO||||||||||||||||||POL99882211',
  },
  {
    id: 'oru-r01-lab-results',
    title: 'ORU^R01 - Comprehensive Metabolic & CBC Lab Results',
    category: 'Diagnostic & Laboratory',
    description:
      'Lab report from automated laboratory information system (LIS) with numeric results, reference ranges, and abnormal flags (High Glucose, Low Sodium).',
    highlights: [
      'LOINC Coded Test Battery (24323-8 CMP)',
      'Numeric Results with Reference Intervals',
      'Abnormal Flags (H = High, L = Low)',
      'Pathologist NTE Diagnostic Comment',
    ],
    raw:
      'MSH|^~\\&|COBAS_8000|CENTRAL_LAB|EPIC_EHR|METRO_HEALTH|20261006154500||ORU^R01^ORU_R01|LAB20261006901|P|2.5.1|||AL|NE\r' +
      'PID|1||MRN987654321^^^METRO_HEALTH^MR||EVERGREEN^ELEANOR^CLAIRE||19840512|F\r' +
      'PV1|1|I|MED^4WEST^402-A\r' +
      'ORC|RE|ORD20261006-11|LIS20261006-99||CM||^^^20261006150000||20261006150500|1234567890^RIVERA^CARLOS^M^DR\r' +
      'OBR|1|ORD20261006-11|LIS20261006-99|24323-8^Comprehensive Metabolic Panel^LN|||20261006150000|||||||||1234567890^RIVERA^CARLOS^M^DR|||||20261006154000|||F\r' +
      'OBX|1|NM|2345-7^Glucose [Mass/volume] in Serum or Plasma^LN||165|mg/dL|70-99|H|||F|||20261006152000|CENTRAL_LAB\r' +
      'OBX|2|NM|2951-2^Sodium [Moles/volume] in Serum or Plasma^LN||132|mmol/L|136-145|L|||F|||20261006152100|CENTRAL_LAB\r' +
      'OBX|3|NM|2823-3^Potassium [Moles/volume] in Serum or Plasma^LN||4.2|mmol/L|3.5-5.1|N|||F|||20261006152200|CENTRAL_LAB\r' +
      'OBX|4|NM|2160-0^Creatinine [Mass/volume] in Serum or Plasma^LN||1.05|mg/dL|0.50-1.10|N|||F|||20261006152300|CENTRAL_LAB\r' +
      'OBX|5|NM|3094-0^Blood Urea Nitrogen [Mass/volume] in Serum or Plasma^LN||18|mg/dL|7-20|N|||F|||20261006152400|CENTRAL_LAB\r' +
      'NTE|1|L|Elevated fasting glucose noted. Recommend HbA1c screening if persistent.',
  },
  {
    id: 'oru-r01-ambiguous-vitals',
    title: 'ORU^R01 - Vital Signs with Semantic Ambiguities',
    category: 'Ambiguity Resolution (HITL)',
    description:
      'Messy vitals flow sheet from bedside monitor. Demonstrates typical real-world clinical data challenges: missing units on weight, non-standard local blood pressure format, temperature in Fahrenheit.',
    highlights: [
      "Missing UCUM Unit: Weight value is '82.5' with empty OBX-6 unit field",
      'Compound Blood Pressure (138/88 in single OBX)',
      'Temperature in [degF] needing UCUM Cel normalization',
      'Ideal for Human-in-the-Loop review',
    ],
    raw:
      'MSH|^~\\&|PHILIPS_INTELLIVUE|ICU_BED_3|EPIC_EHR|METRO_HEALTH|20261006160000||ORU^R01|VIT20261006004|P|2.3\r' +
      'PID|1||MRN554433221^^^METRO_HEALTH^MR||MARTINEZ^MARIA^ROSA||19720918|F\r' +
      'PV1|1|I|ICU^BED3^01\r' +
      'OBR|1||VIT20261006-44|883-9^Vital Signs Panel^LN|||20261006155500\r' +
      'OBX|1|NM|8310-5^Body temperature^LN||99.6|[degF]|97.0-99.0|H|||F\r' +
      'OBX|2|ST|BP_LOCAL^Non-Invasive Blood Pressure^LOCAL||138/88|mm[Hg]|90-120/60-80|H|||F\r' +
      'OBX|3|NM|8867-4^Heart rate^LN||84|/min|60-100|N|||F\r' +
      'OBX|4|NM|29463-7^Body weight^LN||82.5||||||F\r' +
      'OBX|5|NM|59408-5^Oxygen saturation in Arterial blood by Pulse oximetry^LN||97|%|95-100|N|||F\r' +
      'NTE|1|O|Patient restless during weight measurement; scale zeroed prior to standing.',
  },
  {
    id: 'oru-r01-custom-z-segment',
    title: 'ORU^R01 - Radiology Order with Proprietary Z-Segments',
    category: 'Custom Z-Segments',
    description:
      "Chest X-Ray report containing site-specific 'ZDS' (DICOM Study) and 'ZTR' (Patient Transport) segments commonly encountered in real EHRs that break naive parsers.",
    highlights: [
      'Proprietary ZDS Segment: DICOM Study UID, Modality (CR), Series Count',
      'Proprietary ZTR Segment: Transport Mode (Wheelchair), Isolation Status',
      'Unstructured Radiologist Impression in NTE',
      'Tests LLM ability to extract non-standard hospital data',
    ],
    raw:
      'MSH|^~\\&|GE_CENTRICITY_PACS|RADIOLOGY|EPIC_EHR|METRO_HEALTH|20261006161500||ORU^R01|RAD2026100688|P|2.5\r' +
      'PID|1||MRN987654321^^^METRO_HEALTH^MR||EVERGREEN^ELEANOR^CLAIRE||19840512|F\r' +
      'PV1|1|I|MED^4WEST^402-A\r' +
      'OBR|1|RAD-2026-881|PACS-99214|71020^Chest X-Ray 2 Views PA and Lateral^CPT4|||20261006153000|||||||||1234567890^RIVERA^CARLOS^M^DR|||||20261006161000|||F\r' +
      'ZDS|1|1.2.840.113619.2.55.3.4|CR|Chest PA/LAT|ROOM_RAD_02|2|STATION_04^TECH_JOHNSON\r' +
      'ZTR|1|WHEELCHAIR|CONTACT_ISOLATION|NURSE_ESCORT_REQUIRED|O2_PRESCRIBED_2L\r' +
      'OBX|1|TX|18748-4^Diagnostic imaging report^LN||Findings: Bilateral basilar atelectasis noted. No pneumothorax. Heart size normal.||||||F\r' +
      'NTE|1|L|IMPRESSION: Mild bibasilar infiltrate consistent with early bronchopneumonia. Clinical correlation recommended.',
  },
  {
    id: 'adt-a08-cardiology-update',
    title: 'ADT^A08 - Cardiology Visit with Dual Diagnoses & Commercial Insurance',
    category: 'Outpatient & Chronic Care',
    description:
      'Ambulatory specialty encounter for patient info update. Features multiple clinical diagnoses (DG1 for CAD and Hypertension), primary commercial coverage (IN1), and next-of-kin emergency contact.',
    highlights: [
      'Dual Diagnostic Codes: ICD-10 I25.10 (CAD) & I10 (Hypertension)',
      'Commercial Insurance (IN1) with group & subscriber IDs',
      'Emergency Contact (NK1) with specific familial relationship',
      'Maps cleanly to Patient, Encounter, 2 Conditions, and Coverage',
    ],
    raw:
      'MSH|^~\\&|ALLSCRIPTS_EHR|METRO_CARDIO|INTEGRATION_HUB|CENTRAL_HOSP|20261006170000||ADT^A08^ADT_A08|MSG20261006883|P|2.5.1|||AL|NE\r' +
      'EVN|A08|20261006170000|||DR_KAPLAN|20261006165500\r' +
      'PID|1||MRN443322119^^^METRO_CARDIO^MR||GARCIA^ROBERTO^LUIS||19580324|M||2106-3^White^CDCREC|782 BEACON ST^^BOSTON^MA^02215^USA||(617)555-0812||SPA|M||ACCT8899120|999-33-2211||2135-2^Hispanic or Latino^CDCREC\r' +
      'NK1|1|GARCIA^SOFIA^ELENA|DAU^Natural Daughter^HL70063|782 BEACON ST^^BOSTON^MA^02215^USA|(617)555-0814\r' +
      'PV1|1|O|CARDIO^CLINIC_A^EXAM_3|ROUT|||4455667788^KAPLAN^ROBERT^A^DR^MD^^^NPI|||CARDIO||||ROUT|||V202609912|COMM|||||||||||||||||||||||||20261006165500\r' +
      'DG1|1|I10|I25.10^Atherosclerotic heart disease of native coronary artery without angina pectoris^ICD10|Coronary Artery Disease|20261006170000|A\r' +
      'DG1|2|I10|I10^Essential (primary) hypertension^ICD10|Essential Hypertension|20261006170000|W\r' +
      'IN1|1|AETNA01|AETNA_CHOICE^Aetna Choice POS II|AETNA HEALTHCARE|PO BOX 981106^^EL PASO^TX^79998||||||||||POS||||||||||||||||||POL44556611\r' +
      'NTE|1|P|Patient scheduled for 6-month echocardiogram follow-up and lipid panel review.',
  },
];

export function getAllSamples(): HL7Sample[] {
  return SAMPLE_MESSAGES;
}

export function getSampleById(sampleId: string): HL7Sample | undefined {
  return SAMPLE_MESSAGES.find((s) => s.id === sampleId);
}
