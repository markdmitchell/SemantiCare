import type { ValidationResult } from '../types/hl7';

// Closed vocabulary only. Never send diagnostic text, values, IDs, bundles, or raw HL7.
export const failurePaths = [
  'root', 'Bundle.resourceType', 'Bundle.entry', 'Bundle.entry.resource',
  'Resource.id', 'Patient.identifier', 'Patient.name', 'Patient.name.family', 'Patient.gender',
  'Patient.extension.race', 'Patient.extension.ethnicity', 'Observation.status', 'Observation.code',
  'Observation.subject', 'Observation.subject.reference', 'Observation.value',
  'Observation.valueQuantity.unit', 'Encounter.status', 'Encounter.class',
  'DiagnosticReport.status', 'DiagnosticReport.code',
] as const;
export type FailurePath = typeof failurePaths[number];
export type AiValidationContext = { profile: 'base' | 'us-core'; failures: { index: number; path: FailurePath; severity: 'error' | 'warning' | 'information' }[]; omitted: number };

export function prepareValidationContext(result: ValidationResult, profile: string): AiValidationContext {
  const failures: AiValidationContext['failures'] = [];
  result.issues.forEach((issue, index) => {
    let path = issue.location;
    if (/^[A-Za-z]+\.id$/.test(path)) path = 'Resource.id';
    if (/^Bundle\.entry\[\d+\]\.resource$/.test(path)) path = 'Bundle.entry.resource';
    const aliases: Record<string, string> = {
      'Patient.name[0].family': 'Patient.name.family',
      'Patient.extension[us-core-race]': 'Patient.extension.race',
      'Patient.extension[us-core-ethnicity]': 'Patient.extension.ethnicity',
      'Observation.value[x]': 'Observation.value',
    };
    path = aliases[path] || path;
    const allowed = failurePaths.find((item) => item === path);
    if (allowed && failures.length < 40) failures.push({ index: index + 1, path: allowed, severity: issue.severity });
  });
  return { profile: profile === 'base' ? 'base' : 'us-core', failures, omitted: result.issues.length - failures.length };
}