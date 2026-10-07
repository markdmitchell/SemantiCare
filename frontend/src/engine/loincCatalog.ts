/**
 * Local Terminology Grounding Engine
 * Ported 1:1 from app/terminology/loinc_catalog.py
 */

export interface LOINCEntry {
  code: string;
  display: string;
  category: string;
  preferred_ucum_unit: string;
  common_names: string[];
  system: string;
}

function entry(
  code: string,
  display: string,
  category: string,
  preferredUcumUnit: string,
  commonNames: string[],
  system: string = 'http://loinc.org'
): LOINCEntry {
  return { code, display, category, preferred_ucum_unit: preferredUcumUnit, common_names: commonNames, system };
}

export const LOINC_DICTIONARY: Record<string, LOINCEntry> = {
  '2345-7': entry('2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 'Laboratory', 'mg/dL', ['glucose', 'fasting glucose', 'glu', 'blood sugar']),
  '2951-2': entry('2951-2', 'Sodium [Moles/volume] in Serum or Plasma', 'Laboratory', 'mmol/L', ['sodium', 'na', 'serum sodium']),
  '2823-3': entry('2823-3', 'Potassium [Moles/volume] in Serum or Plasma', 'Laboratory', 'mmol/L', ['potassium', 'k', 'serum potassium']),
  '2075-0': entry('2075-0', 'Chloride [Moles/volume] in Serum or Plasma', 'Laboratory', 'mmol/L', ['chloride', 'cl']),
  '2028-9': entry('2028-9', 'Carbon dioxide, total [Moles/volume] in Serum or Plasma', 'Laboratory', 'mmol/L', ['co2', 'bicarbonate', 'total co2']),
  '3094-0': entry('3094-0', 'Blood Urea Nitrogen [Mass/volume] in Serum or Plasma', 'Laboratory', 'mg/dL', ['bun', 'urea nitrogen']),
  '2160-0': entry('2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', 'Laboratory', 'mg/dL', ['creatinine', 'creat', 'serum creatinine']),
  '17861-6': entry('17861-6', 'Calcium [Mass/volume] in Serum or Plasma', 'Laboratory', 'mg/dL', ['calcium', 'ca']),
  '2885-2': entry('2885-2', 'Protein, total [Mass/volume] in Serum or Plasma', 'Laboratory', 'g/dL', ['total protein', 'tp']),
  '1751-7': entry('1751-7', 'Albumin [Mass/volume] in Serum or Plasma', 'Laboratory', 'g/dL', ['albumin', 'alb']),
  '1975-2': entry('1975-2', 'Bilirubin, total [Mass/volume] in Serum or Plasma', 'Laboratory', 'mg/dL', ['total bilirubin', 'bili']),
  '6768-6': entry('6768-6', 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma', 'Laboratory', 'U/L', ['alkaline phosphatase', 'alk phos', 'alp']),
  '1742-6': entry('1742-6', 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma', 'Laboratory', 'U/L', ['alt', 'sgpt']),
  '1920-8': entry('1920-8', 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma', 'Laboratory', 'U/L', ['ast', 'sgot']),
  '24323-8': entry('24323-8', 'Comprehensive metabolic 1998 panel - Serum or Plasma', 'Laboratory', '{panel}', ['cmp', 'comprehensive metabolic panel']),

  '6690-2': entry('6690-2', 'Leukocytes [#/volume] in Blood by Automated count', 'Laboratory', '10*3/uL', ['wbc', 'white blood count', 'leukocytes']),
  '789-8': entry('789-8', 'Erythrocytes [#/volume] in Blood by Automated count', 'Laboratory', '10*6/uL', ['rbc', 'red blood count', 'erythrocytes']),
  '718-7': entry('718-7', 'Hemoglobin [Mass/volume] in Blood', 'Laboratory', 'g/dL', ['hemoglobin', 'hgb', 'hb']),
  '4544-3': entry('4544-3', 'Hematocrit [Volume Fraction] of Blood by Automated count', 'Laboratory', '%', ['hematocrit', 'hct']),
  '777-3': entry('777-3', 'Platelets [#/volume] in Blood by Automated count', 'Laboratory', '10*3/uL', ['platelets', 'plt', 'platelet count']),
  '58410-2': entry('58410-2', 'Complete blood count (CBC) with automated differential panel', 'Laboratory', '{panel}', ['cbc', 'cbc with diff']),

  '85354-9': entry('85354-9', 'Blood pressure panel with all children optional', 'Vital Signs', 'mm[Hg]', ['blood pressure', 'bp', 'blood pressure panel', 'bp_local']),
  '8480-6': entry('8480-6', 'Systolic blood pressure', 'Vital Signs', 'mm[Hg]', ['systolic', 'systolic bp', 'sbp']),
  '8462-4': entry('8462-4', 'Diastolic blood pressure', 'Vital Signs', 'mm[Hg]', ['diastolic', 'diastolic bp', 'dbp']),
  '8867-4': entry('8867-4', 'Heart rate', 'Vital Signs', '/min', ['heart rate', 'pulse', 'hr', 'bpm']),
  '8310-5': entry('8310-5', 'Body temperature', 'Vital Signs', 'Cel', ['body temperature', 'temp', 'temperature']),
  '29463-7': entry('29463-7', 'Body weight', 'Vital Signs', 'kg', ['body weight', 'weight', 'wt']),
  '8302-2': entry('8302-2', 'Body height', 'Vital Signs', 'cm', ['body height', 'height', 'ht', 'stature']),
  '39156-5': entry('39156-5', 'Body mass index (BMI) [Ratio]', 'Vital Signs', 'kg/m2', ['bmi', 'body mass index']),
  '59408-5': entry('59408-5', 'Oxygen saturation in Arterial blood by Pulse oximetry', 'Vital Signs', '%', ['pulse ox', 'spo2', 'o2 sat', 'oxygen saturation']),
  '9279-1': entry('9279-1', 'Respiratory rate', 'Vital Signs', '/min', ['respiratory rate', 'rr', 'resp rate', 'breaths per minute']),

  '18748-4': entry('18748-4', 'Diagnostic imaging report', 'Radiology', '{report}', ['radiology report', 'imaging report', 'x-ray report']),
  '71020': entry('71020', 'Radiologic examination, chest, 2 views', 'Radiology', '{study}', ['chest x-ray', 'cxr', 'chest pa and lat'], 'http://www.ama-assn.org/go/cpt'),
};

export const STANDARD_UCUM_UNITS: Record<string, { name: string; category: string }> = {
  'mg/dL': { name: 'milligram per deciliter', category: 'concentration' },
  'g/dL': { name: 'gram per deciliter', category: 'concentration' },
  'mmol/L': { name: 'millimole per liter', category: 'concentration' },
  '10*3/uL': { name: 'thousand per microliter', category: 'cell count' },
  '10*6/uL': { name: 'million per microliter', category: 'cell count' },
  '%': { name: 'percent', category: 'fraction' },
  'mm[Hg]': { name: 'millimeter of mercury', category: 'pressure' },
  '/min': { name: 'per minute', category: 'frequency' },
  Cel: { name: 'degree Celsius', category: 'temperature' },
  '[degF]': { name: 'degree Fahrenheit', category: 'temperature' },
  kg: { name: 'kilogram', category: 'mass' },
  '[lb_av]': { name: 'pound (avoirdupois)', category: 'mass' },
  g: { name: 'gram', category: 'mass' },
  cm: { name: 'centimeter', category: 'length' },
  '[in_i]': { name: 'inch', category: 'length' },
  'kg/m2': { name: 'kilogram per square meter', category: 'body mass index' },
};

export interface LoincLookupResult {
  code: string;
  display: string;
  system: string;
  preferred_unit: string;
  category: string;
  is_grounded: true;
}

export function lookupLoinc(code: string): LoincLookupResult | null {
  const cleanCode = (code || '').trim();
  const e = LOINC_DICTIONARY[cleanCode];
  if (e) {
    return {
      code: e.code,
      display: e.display,
      system: e.system,
      preferred_unit: e.preferred_ucum_unit,
      category: e.category,
      is_grounded: true,
    };
  }
  return null;
}

export interface TerminologyMatch {
  code: string;
  display: string;
  system: string;
  preferred_unit: string;
  confidence: number;
  reason: string;
}

function tokenize(text: string): Set<string> {
  const matches = text.toLowerCase().match(/\w+/g) || [];
  return new Set(matches);
}

export function matchTerminology(queryText: string): TerminologyMatch[] {
  if (!queryText) return [];

  const tokens = tokenize(queryText);
  const matches: TerminologyMatch[] = [];

  for (const code of Object.keys(LOINC_DICTIONARY)) {
    const e = LOINC_DICTIONARY[code];

    if (queryText.toLowerCase() === code.toLowerCase()) {
      return [
        {
          code: e.code,
          display: e.display,
          system: e.system,
          preferred_unit: e.preferred_ucum_unit,
          confidence: 1.0,
          reason: 'Exact LOINC code match',
        },
      ];
    }

    let maxScore = 0.0;
    let matchReason = '';

    for (const name of e.common_names) {
      if (name === queryText.toLowerCase()) {
        maxScore = 0.95;
        matchReason = `Exact synonym match: '${name}'`;
        break;
      }
      const nameTokens = tokenize(name);
      if (tokens.size && nameTokens.size) {
        const intersection = new Set([...tokens].filter((t) => nameTokens.has(t)));
        if (intersection.size === tokens.size && tokens.size > 0) {
          const score = 0.85;
          if (score > maxScore) {
            maxScore = score;
            matchReason = `Full token containment in '${name}'`;
          }
        } else if (intersection.size > 0) {
          const score = 0.5 + 0.35 * (intersection.size / Math.max(tokens.size, nameTokens.size));
          if (score > maxScore) {
            maxScore = score;
            matchReason = `Partial token match: ${JSON.stringify([...intersection])}`;
          }
        }
      }
    }

    if (maxScore >= 0.5) {
      matches.push({
        code: e.code,
        display: e.display,
        system: e.system,
        preferred_unit: e.preferred_ucum_unit,
        confidence: Math.round(maxScore * 100) / 100,
        reason: matchReason,
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, 4);
}

export function validateUcum(unitStr: string): boolean {
  if (!unitStr) return false;
  const clean = unitStr.trim();
  return clean in STANDARD_UCUM_UNITS;
}

export function inferMissingUnitCandidates(analyteDescription: string): string[] {
  const query = (analyteDescription || '').toLowerCase();
  if (['weight', 'wt', 'body weight'].some((w) => query.includes(w))) return ['kg', '[lb_av]'];
  if (['height', 'ht', 'stature'].some((w) => query.includes(w))) return ['cm', '[in_i]'];
  if (['temperature', 'temp'].some((w) => query.includes(w))) return ['Cel', '[degF]'];
  if (['blood pressure', 'systolic', 'diastolic'].some((w) => query.includes(w))) return ['mm[Hg]'];
  if (['heart rate', 'pulse', 'respiratory rate'].some((w) => query.includes(w))) return ['/min'];
  if (['glucose', 'creatinine', 'bun', 'calcium'].some((w) => query.includes(w))) return ['mg/dL', 'mmol/L'];
  return ['1', '{ratio}'];
}
