/**
 * Clinical NLP & Narrative Entity Extractor for HL7 NTE Segments (TypeScript Port).
 * Extracts structured clinical findings (Conditions), drug allergies (AllergyIntolerance),
 * and care plan recommendations (ServiceRequest) from unstructured physician/pathologist notes.
 */

export interface ExtractedClinicalEntity {
  entity_type: 'CONDITION' | 'ALLERGY' | 'RECOMMENDATION';
  text: string;
  code: string;
  display: string;
  system: string;
  confidence: number;
  source_segment: string;
  fhir_resource: Record<string, any>;
}

const CONDITION_PATTERNS: Array<[RegExp, string, string, string]> = [
  [/\b(bronchopneumonia|pneumonia)\b/i, 'J18.9', 'Pneumonia, unspecified organism', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(atelectasis|basilar atelectasis)\b/i, 'J98.11', 'Atelectasis', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(pleural effusion)\b/i, 'J90', 'Pleural effusion, not elsewhere classified', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(infiltrate|bibasilar infiltrate)\b/i, 'R91.8', 'Other nonspecific abnormal findings of lung field', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(elevated (?:fasting )?glucose|hyperglycemia)\b/i, 'R73.9', 'Hyperglycemia, unspecified', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(hypertension|htn)\b/i, 'I10', 'Essential (primary) hypertension', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(hyponatremia)\b/i, 'E87.1', 'Hypo-osmolality and hyponatremia', 'http://hl7.org/fhir/sid/icd-10-cm'],
  [/\b(cardiomegaly)\b/i, 'I51.7', 'Cardiomegaly', 'http://hl7.org/fhir/sid/icd-10-cm'],
];

const ALLERGY_PATTERNS: Array<[RegExp, string, string, string, 'high' | 'medium' | 'low']> = [
  [/\b(?:allergic to|allergy to|reaction to)\s+(penicillin|amoxicillin)\b/i, '70618', 'Penicillin', 'http://www.nlm.nih.gov/research/umls/rxnorm', 'high'],
  [/\b(?:allergic to|allergy to|reaction to)\s+(sulfa|sulfonamides?)\b/i, '9944', 'Sulfonamide', 'http://www.nlm.nih.gov/research/umls/rxnorm', 'high'],
  [/\b(?:allergic to|allergy to|reaction to)\s+(aspirin|asa)\b/i, '1191', 'Aspirin', 'http://www.nlm.nih.gov/research/umls/rxnorm', 'medium'],
  [/\b(?:allergic to|allergy to|reaction to)\s+(latex)\b/i, '111088007', 'Latex', 'http://snomed.info/sct', 'high'],
  [/\b(?:allergic to|allergy to|reaction to)\s+(iodine|contrast)\b/i, '387406002', 'Iodine contrast media', 'http://snomed.info/sct', 'high'],
];

const RECOMMENDATION_PATTERNS: Array<[RegExp, string, string]> = [
  [/\b(?:recommend|recommended|consider)\s+([a-z0-9\s\-]+screening|[a-z0-9\s\-]+panel|[a-z0-9\s\-]+test)\b/i, '4548-4', 'Hemoglobin A1c screening recommendation'],
  [/\b(?:scheduled for|follow-up)\s+([a-z0-9\s\-]+follow-up|[a-z0-9\s\-]+echocardiogram|[a-z0-9\s\-]+consult)\b/i, '40701008', 'Clinical Follow-Up Recommendation'],
];

const randHex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export function extractEntitiesFromNte(
  nteText: string,
  patientUrn: string,
  encounterUrn: string,
  sourceSegId: string = 'NTE-3'
): ExtractedClinicalEntity[] {
  if (!nteText || !nteText.trim()) return [];

  const cleanText = nteText.trim();
  const entities: ExtractedClinicalEntity[] = [];

  // 1. Condition & Findings Extraction
  for (const [regexPat, code, display, system] of CONDITION_PATTERNS) {
    const match = cleanText.match(regexPat);
    if (match) {
      const matchedPhrase = match[0];
      const condId = `cond-nte-${randHex(8)}`;
      const resource = {
        resourceType: 'Condition',
        id: condId,
        meta: {
          tag: [
            {
              system: 'http://semanticare.health/tags',
              code: 'nte-extracted',
              display: 'Extracted from NTE Clinical Narrative',
            },
          ],
        },
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
              display: 'Active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'provisional',
              display: 'Provisional / Derived',
            },
          ],
        },
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                code: 'clinical-finding',
                display: 'Clinical Finding',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system,
              code,
              display,
            },
          ],
          text: display,
        },
        subject: { reference: patientUrn },
        encounter: { reference: encounterUrn },
        note: [{ text: `Extracted from ${sourceSegId}: "${cleanText}"` }],
      };

      entities.push({
        entity_type: 'CONDITION',
        text: matchedPhrase,
        code,
        display,
        system,
        confidence: 0.92,
        source_segment: sourceSegId,
        fhir_resource: resource,
      });
    }
  }

  // 2. Allergy & Intolerance Extraction
  for (const [regexPat, code, display, system, criticality] of ALLERGY_PATTERNS) {
    const match = cleanText.match(regexPat);
    if (match) {
      const matchedSubstance = match[1] || match[0];
      const allergyId = `alg-nte-${randHex(8)}`;
      const resource = {
        resourceType: 'AllergyIntolerance',
        id: allergyId,
        meta: {
          tag: [
            {
              system: 'http://semanticare.health/tags',
              code: 'nte-extracted',
              display: 'Extracted from NTE Clinical Narrative',
            },
          ],
        },
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
              code: 'active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
              code: 'confirmed',
            },
          ],
        },
        type: 'allergy',
        category: ['medication'],
        criticality,
        code: {
          coding: [
            {
              system,
              code,
              display,
            },
          ],
          text: display,
        },
        patient: { reference: patientUrn },
        note: [{ text: `Extracted from ${sourceSegId}: "${cleanText}"` }],
      };

      entities.push({
        entity_type: 'ALLERGY',
        text: matchedSubstance,
        code,
        display,
        system,
        confidence: 0.95,
        source_segment: sourceSegId,
        fhir_resource: resource,
      });
    }
  }

  // 3. Care Recommendations / Proposals
  for (const [regexPat, defaultCode, defaultDisplay] of RECOMMENDATION_PATTERNS) {
    const match = cleanText.match(regexPat);
    if (match) {
      const recText = match[0];
      const reqId = `sr-nte-${randHex(8)}`;
      const resource = {
        resourceType: 'ServiceRequest',
        id: reqId,
        meta: {
          tag: [
            {
              system: 'http://semanticare.health/tags',
              code: 'nte-extracted',
              display: 'Extracted from NTE Clinical Narrative',
            },
          ],
        },
        status: 'draft',
        intent: 'proposal',
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: defaultCode,
              display: defaultDisplay,
            },
          ],
          text: recText.charAt(0).toUpperCase() + recText.slice(1),
        },
        subject: { reference: patientUrn },
        encounter: { reference: encounterUrn },
        note: [{ text: `Recommendation from ${sourceSegId}: "${cleanText}"` }],
      };

      entities.push({
        entity_type: 'RECOMMENDATION',
        text: recText,
        code: defaultCode,
        display: defaultDisplay,
        system: 'http://snomed.info/sct',
        confidence: 0.88,
        source_segment: sourceSegId,
        fhir_resource: resource,
      });
    }
  }

  return entities;
}
