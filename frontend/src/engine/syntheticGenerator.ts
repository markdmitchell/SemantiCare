/**
 * Synthetic Clinical HL7 v2 Message Generator Engine
 * Zero-dependency, client-side synthetic HL7 generator for clinical demonstrations,
 * unit testing, and interactive human-in-the-loop (HITL) tutorials.
 *
 * Adheres to HL7 v2 standard specifications and project rules:
 * - No em dashes (hyphens or colons used)
 * - Standard field/component delimiters (| ^ ~ \ &)
 * - N/A for missing values
 */

export type SyntheticPreset =
  | 'golden_walkthrough'
  | 'cardiology'
  | 'critical_lab'
  | 'hitl_showcase';

export interface SyntheticMessageResult {
  id: string;
  title: string;
  category: string;
  description: string;
  highlights: string[];
  raw: string;
  scenarioType: SyntheticPreset;
  expectedAmbiguities: number;
}

// Helpers for pseudo-random deterministic or non-deterministic generation
function createRng(seed?: number) {
  let s = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function padZero(num: number, len = 2): string {
  return String(num).padStart(len, '0');
}

function formatHL7Timestamp(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  const h = padZero(date.getHours());
  const min = padZero(date.getMinutes());
  const s = padZero(date.getSeconds());
  return `${y}${m}${d}${h}${min}${s}`;
}

const FIRST_NAMES_F = ['MARGARET', 'ELEANOR', 'SOPHIA', 'BEATRICE', 'CLAIRE', 'MIRIAM', 'ELIZABETH', 'KATHERINE'];
const FIRST_NAMES_M = ['ARTHUR', 'EDWARD', 'CHARLES', 'VICTOR', 'ROLAND', 'LEONARD', 'BENJAMIN', 'SAMUEL'];
const LAST_NAMES = ['VANCE', 'HAWTHORNE', 'STERLING', 'WINSLOW', 'KAUFMAN', 'DELGADO', 'CALLAHAN', 'MONTGOMERY'];
const MIDDLE_NAMES = ['JEAN', 'THOMAS', 'CLAIRE', 'EDWARD', 'MARIE', 'FRANCIS', 'ANNE', 'JOSEPH'];

const STREETS = [
  '742 EVERGREEN TERRACE',
  '452 COMMONWEALTH AVE',
  '128 BEACON STREET',
  '89 HUNTINGTON ROAD',
  '314 CAMBRIDGE PARKWAY',
  '55 TREMONT BLVD',
];

const CITIES = [
  { city: 'BOSTON', state: 'MA', zip: '02115' },
  { city: 'CAMBRIDGE', state: 'MA', zip: '02138' },
  { city: 'BROOKLINE', state: 'MA', zip: '02445' },
  { city: 'NEWTON', state: 'MA', zip: '02458' },
];

const CARDIAC_DIAGNOSES = [
  { code: 'I50.9', display: 'Heart failure, unspecified', desc: 'Congestive Heart Failure' },
  { code: 'I25.10', display: 'Atherosclerotic heart disease of native coronary artery', desc: 'Coronary Artery Disease' },
  { code: 'I48.91', display: 'Unspecified atrial fibrillation', desc: 'Atrial Fibrillation' },
  { code: 'I10', display: 'Essential (primary) hypertension', desc: 'Hypertension' },
];

const PAYERS = [
  { id: 'BCBS001', code: 'BCBS_MA', name: 'Blue Cross Blue Shield MA', policy: 'POL99882211' },
  { id: 'AET002', code: 'AETNA_COMM', name: 'Aetna Open Choice PPO', policy: 'AET449012' },
  { id: 'UHC003', code: 'UHC_PREMIER', name: 'UnitedHealthcare Choice', policy: 'UHC881293' },
];

/**
 * 1. Golden Walkthrough Case
 * Pre-scripted, reliable presentation case highlighting:
 * - Patient Demographics & Attending Physician
 * - Inpatient Room/Bed & Cardiac Diagnosis
 * - Predictive Ambiguities: Missing unit on weight & Local BP code
 * - Narrative NTE note triggering Clinical NLP for Condition, Allergy, and Care Plan
 */
export function generateGoldenWalkthroughCase(): SyntheticMessageResult {
  const ts = '20261011120000';
  const raw = [
    `MSH|^~\\&|OCEAN_LIS|OCEAN_MEDICAL|EPIC_EHR|METRO_HEALTH|${ts}||ORU^R01^ORU_R01|MSG20261011001|P|2.5.1|||AL|NE`,
    'PID|1||MRN847291032^^^OCEAN_HEALTH^MR||VANCE^MARGARET^JEAN||19780315|F||2106-3^White^CDCREC|742 EVERGREEN TERRACE^^BOSTON^MA^02115^USA||(617)555-0144||ENG|M||ACCT2026-8819|999-34-5678||2186-5^Not Hispanic or Latino^CDCREC',
    'PV1|1|I|CARD^4EAST^412-B|EMER|||1829304912^HENDERSON^CLAIRE^E^DR^MD^^^NPI|||CARD||||EMER|||V202609141|COMM|||||||||||||||||||||||||20261011113000',
    'DG1|1|I10|I50.9^Heart failure, unspecified|Congestive Heart Failure|20261011120000|A',
    'ORC|RE|ORD20261011-88|LIS20261011-04||CM||^^^20261011114500||20261011115000|1829304912^HENDERSON^CLAIRE^E^DR',
    'OBR|1|ORD20261011-88|LIS20261011-04|85354-9^Blood pressure panel with all children optional^LN|||20261011114500|||||||||1829304912^HENDERSON^CLAIRE^E^DR|||||20261011115500|||F',
    'OBX|1|NM|8310-5^Body temperature^LN||98.6|[degF]|97.0-99.0|N|||F|||20261011114500|BEDSIDE',
    'OBX|2|ST|BP_LOCAL^Non-Invasive Blood Pressure^LOCAL||138/88|mm[Hg]||H|||F|||20261011114600|BEDSIDE',
    'OBX|3|NM|29463-7^Body weight^LN||74.5|||N|||F|||20261011114700|BEDSIDE',
    'OBX|4|NM|2345-7^Glucose [Mass/volume] in Serum or Plasma^LN||285|mg/dL|70-99|H|||F|||20261011114800|LAB',
    'NTE|1|L|Patient presents with progressive dyspnea on exertion and bilateral lower extremity edema. Schedule outpatient echocardiogram and initiate lisinopril. Severe penicillin allergy noted.',
  ].join('\r');

  return {
    id: 'synthetic-golden-walkthrough',
    title: 'Guided Demo: Golden Clinical Walkthrough Case',
    category: 'Interactive Tutorial',
    description:
      'Curated showcase case: Inpatient cardiology admission with bedside vitals, unmapped local blood pressure, missing weight units, and narrative NLP clinical findings.',
    highlights: [
      'Inpatient Cardiology Demographics (Margaret Vance, MRN 847291032)',
      'Human-in-the-Loop Ambiguities: Missing unit on weight & Local BP code',
      'Clinical NLP narrative extraction: Condition, Allergy, and ServiceRequest',
      'US Core 3.1.1 compliant FHIR R4 Bundle',
    ],
    raw,
    scenarioType: 'golden_walkthrough',
    expectedAmbiguities: 3,
  };
}

/**
 * 2. Cardiology / Inpatient Admission (ADT^A01)
 * Randomized or deterministic admission with demographics, attending MD,
 * room/bed, diagnosis, and commercial payer.
 */
export function generateCardiologyAdmission(options?: { seed?: number; deterministic?: boolean }): SyntheticMessageResult {
  const rng = createRng(options?.deterministic ? 42 : options?.seed);
  const isFemale = rng() > 0.5;
  const firstName = pickRandom(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M, rng);
  const lastName = pickRandom(LAST_NAMES, rng);
  const middleName = pickRandom(MIDDLE_NAMES, rng);
  const cityObj = pickRandom(CITIES, rng);
  const street = pickRandom(STREETS, rng);
  const diagnosis = pickRandom(CARDIAC_DIAGNOSES, rng);
  const payer = pickRandom(PAYERS, rng);

  const mrnSuffix = Math.floor(rng() * 899999 + 100000);
  const mrn = `MRN${mrnSuffix}`;
  const ssn = `${Math.floor(rng() * 899 + 100)}-${Math.floor(rng() * 89 + 10)}-${Math.floor(rng() * 8999 + 1000)}`;
  const birthYear = Math.floor(rng() * 45 + 1950);
  const birthMonth = padZero(Math.floor(rng() * 12 + 1));
  const birthDay = padZero(Math.floor(rng() * 28 + 1));
  const dob = `${birthYear}${birthMonth}${birthDay}`;

  const roomNum = Math.floor(rng() * 30 + 401);
  const bedLetter = rng() > 0.5 ? 'A' : 'B';
  const bed = `CARD^4WEST^${roomNum}-${bedLetter}`;

  const ts = formatHL7Timestamp(new Date());

  const raw = [
    `MSH|^~\\&|EPIC_EHR|METRO_HEALTH|INTEGRATION_HUB|CENTRAL_HOSP|${ts}||ADT^A01^ADT_A01|MSG${mrnSuffix}|P|2.5.1|||AL|NE`,
    `EVN|A01|${ts}|||DR_HENDERSON|${ts}`,
    `PID|1||${mrn}^^^METRO_HEALTH^MR||${lastName}^${firstName}^${middleName}||${dob}|${isFemale ? 'F' : 'M'}||2106-3^White^CDCREC|${street}^^${cityObj.city}^${cityObj.state}^${cityObj.zip}^USA||(617)555-01${Math.floor(rng() * 89 + 10)}||ENG|M||ACCT2026-${mrnSuffix}|${ssn}||2186-5^Not Hispanic or Latino^CDCREC`,
    `NK1|1|${lastName}^THOMAS^E|SPO^Spouse^HL70063|${street}^^${cityObj.city}^${cityObj.state}^${cityObj.zip}^USA|(617)555-0199`,
    `PV1|1|I|${bed}|EMER|||1829304912^HENDERSON^CLAIRE^E^DR^MD^^^NPI|||CARD||||EMER|||V2026${mrnSuffix}|COMM|||||||||||||||||||||||||${ts}`,
    `DG1|1|I10|${diagnosis.code}^${diagnosis.display}|${diagnosis.desc}|${ts}|A`,
    `IN1|1|${payer.id}|${payer.code}^${payer.name}|${payer.name}|PO BOX 9000^^BOSTON^MA^02101||||||||||PPO||||||||||||||||||${payer.policy}`,
    `NTE|1|L|Admitted through Emergency Department for acute stabilization of ${diagnosis.desc}. Patient alert and oriented.`,
  ].join('\r');

  return {
    id: `synthetic-cardiology-${mrnSuffix}`,
    title: `ADT^A01: Inpatient Cardiology Admission (${firstName} ${lastName})`,
    category: 'Cardiology / Admission',
    description: `Synthetic cardiology admission for ${firstName} ${lastName} with ${diagnosis.desc}, bed assignment ${bed.replace('^', ' '), payer.name}, and ICD-10 coding.`,
    highlights: [
      `Demographics: ${firstName} ${lastName} (${isFemale ? 'Female' : 'Male'}, DOB: ${birthYear}-${birthMonth}-${birthDay})`,
      `Admitting Diagnosis: ${diagnosis.code} (${diagnosis.desc})`,
      `Bed Assignment: Room ${roomNum}, Bed ${bedLetter}`,
      `Health Plan: ${payer.name}`,
    ],
    raw,
    scenarioType: 'cardiology',
    expectedAmbiguities: 0,
  };
}

/**
 * 3. Critical Lab Battery (ORU^R01)
 * Randomizes CBC / CMP with critical panic flags:
 * - Severe Hyperglycemia (Glucose > 300)
 * - Hyponatremia (Sodium < 125)
 * - Hyperkalemia (Potassium > 6.0)
 */
export function generateCriticalLabBattery(options?: { seed?: number; deterministic?: boolean }): SyntheticMessageResult {
  const rng = createRng(options?.deterministic ? 99 : options?.seed);
  const isFemale = rng() > 0.5;
  const firstName = pickRandom(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M, rng);
  const lastName = pickRandom(LAST_NAMES, rng);
  const mrnSuffix = Math.floor(rng() * 899999 + 100000);
  const ts = formatHL7Timestamp(new Date());

  const glucoseVal = Math.floor(rng() * 80 + 310); // 310 - 390
  const sodiumVal = Math.floor(rng() * 6 + 119); // 119 - 125
  const potassiumVal = (rng() * 0.9 + 6.1).toFixed(1); // 6.1 - 7.0
  const creatinineVal = (rng() * 1.2 + 2.1).toFixed(2); // 2.1 - 3.3

  const raw = [
    `MSH|^~\\&|COBAS_PANEL|CENTRAL_LAB|EPIC_EHR|METRO_HEALTH|${ts}||ORU^R01^ORU_R01|LAB${mrnSuffix}|P|2.5.1|||AL|NE`,
    `PID|1||MRN${mrnSuffix}^^^METRO_HEALTH^MR||${lastName}^${firstName}||19650824|${isFemale ? 'F' : 'M'}`,
    'PV1|1|I|ICU^2EAST^204-A',
    `ORC|RE|ORD${mrnSuffix}-LAB|LIS${mrnSuffix}-CRIT||CM||^^^${ts}||${ts}|1928374650^MARTINEZ^LUIS^DR`,
    `OBR|1|ORD${mrnSuffix}-LAB|LIS${mrnSuffix}-CRIT|24323-8^Comprehensive Metabolic Panel^LN|||${ts}|||||||||1928374650^MARTINEZ^LUIS^DR|||||${ts}|||F`,
    `OBX|1|NM|2345-7^Glucose [Mass/volume] in Serum or Plasma^LN||${glucoseVal}|mg/dL|70-99|PANIC|||F|||${ts}|CENTRAL_LAB`,
    `OBX|2|NM|2951-2^Sodium [Moles/volume] in Serum or Plasma^LN||${sodiumVal}|mmol/L|136-145|PANIC|||F|||${ts}|CENTRAL_LAB`,
    `OBX|3|NM|2823-3^Potassium [Moles/volume] in Serum or Plasma^LN||${potassiumVal}|mmol/L|3.5-5.1|H|||F|||${ts}|CENTRAL_LAB`,
    `OBX|4|NM|2160-0^Creatinine [Mass/volume] in Serum or Plasma^LN||${creatinineVal}|mg/dL|0.50-1.10|H|||F|||${ts}|CENTRAL_LAB`,
    `OBX|5|NM|3094-0^Blood Urea Nitrogen [Mass/volume] in Serum or Plasma^LN||48|mg/dL|7-20|H|||F|||${ts}|CENTRAL_LAB`,
    `NTE|1|L|CRITICAL VALUE NOTIFICATION: Severe hyperglycemia (${glucoseVal} mg/dL) and hyponatremia (${sodiumVal} mmol/L) called to ICU bedside nurse at ${ts.slice(8, 12)}. Immediate endocrinology consult requested.`,
  ].join('\r');

  return {
    id: `synthetic-critical-lab-${mrnSuffix}`,
    title: `ORU^R01: Critical Panic Lab Battery (${firstName} ${lastName})`,
    category: 'Critical / Panic Labs',
    description: `STAT metabolic lab battery containing multiple out-of-range panic values: Glucose ${glucoseVal} mg/dL, Sodium ${sodiumVal} mmol/L, Potassium ${potassiumVal} mmol/L.`,
    highlights: [
      `Panic High Glucose: ${glucoseVal} mg/dL (Reference 70-99)`,
      `Panic Low Sodium: ${sodiumVal} mmol/L (Reference 136-145)`,
      `Elevated Potassium: ${potassiumVal} mmol/L`,
      'Pathologist STAT panic call recorded in NTE note',
    ],
    raw,
    scenarioType: 'critical_lab',
    expectedAmbiguities: 0,
  };
}

/**
 * 4. Interactive HITL Showcase
 * Injects deliberate semantic challenges:
 * - Unmapped local code `BP_LOCAL`
 * - Compound blood pressure `144/92`
 * - Missing UCUM unit on body weight
 * - Non-standard observation status
 */
export function generateHitlShowcase(options?: { seed?: number; deterministic?: boolean }): SyntheticMessageResult {
  const rng = createRng(options?.deterministic ? 777 : options?.seed);
  const isFemale = rng() > 0.5;
  const firstName = pickRandom(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M, rng);
  const lastName = pickRandom(LAST_NAMES, rng);
  const mrnSuffix = Math.floor(rng() * 899999 + 100000);
  const ts = formatHL7Timestamp(new Date());

  const systolic = Math.floor(rng() * 20 + 135);
  const diastolic = Math.floor(rng() * 15 + 85);
  const weightKg = (rng() * 25 + 70).toFixed(1);
  const tempF = (rng() * 2.5 + 98.2).toFixed(1);

  const raw = [
    `MSH|^~\\&|BEDSIDE_MONITOR|STEPDOWN_UNIT|EPIC_EHR|METRO_HEALTH|${ts}||ORU^R01|VITALS${mrnSuffix}|P|2.3|||AL|NE`,
    `PID|1||MRN${mrnSuffix}^^^METRO_HEALTH^MR||${lastName}^${firstName}||19721105|${isFemale ? 'F' : 'M'}`,
    'PV1|1|I|STEPDOWN^3WEST^312-A',
    `OBR|1|VITALS${mrnSuffix}|MONITOR${mrnSuffix}|85354-9^Vital signs panel^LN|||${ts}`,
    `OBX|1|NM|8310-5^Body temperature^LN||${tempF}|[degF]|97.0-99.0|N|||F`,
    `OBX|2|ST|BP_LOCAL^Non-Invasive Blood Pressure^LOCAL||${systolic}/${diastolic}|mm[Hg]||H|||F`,
    `OBX|3|NM|29463-7^Body weight^LN||${weightKg}|||N|||F`,
    `OBX|4|NM|8867-4^Heart rate^LN||82|/min|60-100|N|||F`,
    'NTE|1|L|Routine stepdown vital signs recorded via bedside telemetry monitor.',
  ].join('\r');

  return {
    id: `synthetic-hitl-${mrnSuffix}`,
    title: `ORU^R01: HITL Ambiguity Resolution Showcase (${firstName} ${lastName})`,
    category: 'Ambiguity Resolution (HITL)',
    description: `Intentionally introduces 3 clinical ambiguities (unmapped local test code, compound blood pressure reading, and missing weight unit) to showcase human-in-the-loop resolution.`,
    highlights: [
      `Local Test Code: 'BP_LOCAL' requires informaticist LOINC grounding`,
      `Compound Blood Pressure: '${systolic}/${diastolic}' decomposed into components`,
      `Missing UCUM Unit: Weight '${weightKg}' missing unit in OBX-6`,
      'Demonstrates 1-click in-memory resolution & institutional rule learning',
    ],
    raw,
    scenarioType: 'hitl_showcase',
    expectedAmbiguities: 3,
  };
}

/**
 * Universal dispatcher
 */
export function generateSyntheticMessage(preset: SyntheticPreset = 'golden_walkthrough'): SyntheticMessageResult {
  switch (preset) {
    case 'golden_walkthrough':
      return generateGoldenWalkthroughCase();
    case 'cardiology':
      return generateCardiologyAdmission();
    case 'critical_lab':
      return generateCriticalLabBattery();
    case 'hitl_showcase':
      return generateHitlShowcase();
    default:
      return generateGoldenWalkthroughCase();
  }
}
