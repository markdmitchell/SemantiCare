import { expect, it } from 'vitest';
import { contextSchema } from './validation.server';
it('rejects raw HL7 and diagnostic values at the server boundary', () => {
  const input = { profile: 'us-core', failures: [{ index: 1, path: 'Observation.status', severity: 'error' }], omitted: 0 };
  expect(contextSchema.safeParse(input).success).toBe(true);
  expect(contextSchema.safeParse({ ...input, rawHL7: 'PID|||998877||Jane^Smith' }).success).toBe(false);
  expect(contextSchema.safeParse({ ...input, failures: [{ ...input.failures[0], message: 'Jane Smith' }] }).success).toBe(false);
  expect(contextSchema.safeParse({ ...input, failures: [{ ...input.failures[0], path: 'Patient/Jane' }] }).success).toBe(false);
});