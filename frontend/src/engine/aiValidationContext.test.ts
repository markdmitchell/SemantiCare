import { describe, expect, it } from 'vitest';
import { prepareValidationContext } from './aiValidationContext';
import { validateFhirBundle } from './fhirValidator';
describe('AI validation privacy boundary', () => {
  it('excludes patient details and interpolated diagnostic values', () => {
    const report = validateFhirBundle({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Observation', id: 'MRN-998877', status: 'Jane Smith', subject: { reference: 'Patient/Jane-Smith' }, valueQuantity: { value: 123, unit: 'jane@example.com' } } }] });
    const context = prepareValidationContext(report, 'us-core');
    expect(context.failures.some(f => f.path === 'Observation.status')).toBe(true);
    expect(JSON.stringify(context)).not.toMatch(/Jane|998877|example|123/);
  });
  it('drops unknown paths rather than passing arbitrary text', () => {
    const report = validateFhirBundle(null);
    report.issues[0].location = 'Patient.private-Jane-Smith';
    expect(prepareValidationContext(report, 'base')).toEqual({ profile: 'base', failures: [], omitted: 1 });
  });
});