/**
 * Automated Verification Suite for SemantiCare In-Browser TypeScript Engine.
 * Run directly with: node scripts/test_engine.mjs
 */

import assert from 'node:assert';
import { parseHl7Message } from '../frontend/src/engine/hl7Parser.ts';
import { scrubHl7Message, TokenVault } from '../frontend/src/engine/phiScrubber.ts';
import { extractEntitiesFromNte } from '../frontend/src/engine/clinicalNer.ts';
import { seedRules } from '../frontend/src/engine/rulesStore.ts';
import { getAllSamples } from '../frontend/src/engine/sampleMessages.ts';
import { SemanticMapper } from '../frontend/src/engine/mapper.ts';
import { validateFhirBundle } from '../frontend/src/engine/fhirValidator.ts';

console.log('===========================================================');
console.log('  SEMANTICARE IN-BROWSER TYPESCRIPT ENGINE TEST SUITE');
console.log('===========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`[${totalTests}] ${name} ... `);
  try {
    fn();
    passedTests++;
    console.log('PASSED');
  } catch (err) {
    console.log('FAILED');
    console.error('   ', err.message);
  }
}

// 1. Parser Tests
runTest('HL7 Parser - Structural AST Decomposition', () => {
  const samples = getAllSamples();
  assert.ok(samples.length >= 5, 'Must have at least 5 clinical samples');

  for (const sample of samples) {
    const parsed = parseHl7Message(sample.raw);
    assert.strictEqual(parsed.is_valid, true, `Sample ${sample.id} must be valid HL7`);
    assert.ok(parsed.segments.length > 0, `Sample ${sample.id} must have segments`);
    assert.ok(parsed.metadata.message_type, `Sample ${sample.id} must have message type`);
  }
});

// 2. PHI Scrubber Tests
runTest('PHI Scrubber - Zero-Trust Token Vault & Re-hydration', () => {
  const sample = getAllSamples()[0];
  const { scrubbed, vault } = scrubHl7Message(sample.raw);

  assert.ok(vault.count() > 0, 'Vault must record redacted PHI entities');
  assert.ok(!scrubbed.includes('EVERGREEN'), 'Scrubbed message must not contain original family name');
  assert.ok(scrubbed.includes('[PATIENT_'), 'Scrubbed message must contain token placeholders');

  // Test rehydration
  const rehydrated = vault.rehydrateString(scrubbed);
  assert.ok(rehydrated.includes('EVERGREEN'), 'Re-hydrated string must restore original family name');
});

// 3. Clinical NLP Tests
runTest('Clinical NLP - NTE Unstructured Narrative Entity Extraction', () => {
  const nteText = 'IMPRESSION: Mild bibasilar infiltrate consistent with early bronchopneumonia. Patient allergic to penicillin. Recommend HbA1c screening.';
  const entities = extractEntitiesFromNte(nteText, 'urn:uuid:pat-test', 'urn:uuid:enc-test', 'NTE-3');

  assert.ok(entities.length >= 3, 'Must extract at least 3 clinical entities');

  const cond = entities.find((e) => e.entity_type === 'CONDITION');
  assert.ok(cond, 'Condition must be extracted');
  assert.strictEqual(cond.code, 'J18.9');

  const alg = entities.find((e) => e.entity_type === 'ALLERGY');
  assert.ok(alg, 'Allergy must be extracted');
  assert.strictEqual(alg.code, '70618');

  const rec = entities.find((e) => e.entity_type === 'RECOMMENDATION');
  assert.ok(rec, 'Recommendation must be extracted');
  assert.strictEqual(rec.code, '4548-4');
});

// 4. Institutional Rules Store
runTest('Institutional Rules - Seeding & Structure', () => {
  const rules = seedRules();
  assert.ok(rules.length >= 3, 'Must have baseline seeded rules');

  const bpRule = rules.find((r) => r.source_key === 'BP_LOCAL');
  assert.ok(bpRule, 'BP_LOCAL rule must exist');
  assert.strictEqual(bpRule.target_value, '85354-9');

  const unitRule = rules.find((r) => r.source_key === '29463-7');
  assert.ok(unitRule, 'Missing unit rule must exist');
  assert.strictEqual(unitRule.target_value, 'kg');
});

// 5. Semantic Mapping & FHIR R4 Bundle
runTest('Semantic Mapper - End-to-End Bundle Generation', () => {
  const sample = getAllSamples()[1]; // Lab results
  const vault = new TokenVault();
  const parsed = parseHl7Message(sample.raw);
  const mapper = new SemanticMapper();
  const res = mapper.buildBundle({ segments: parsed.segments }, vault);

  assert.ok(res.bundle, 'Must produce a FHIR bundle');
  assert.strictEqual(res.bundle.resourceType, 'Bundle');
  assert.ok(res.bundle.entry.length >= 5, 'Bundle must have at least 5 resource entries');
  assert.ok(res.confidence_score >= 80, 'Confidence score must be >= 80%');

  // Check validation
  const validation = validateFhirBundle(res.bundle, 'us-core');
  assert.strictEqual(validation.is_valid, true, 'Bundle must pass US Core schema validation');
  assert.ok(validation.conformance_score >= 90, 'Conformance score must be >= 90%');
});

console.log('\n===========================================================');
console.log(`  RESULTS: ${passedTests} / ${totalTests} test suites passed cleanly.`);
console.log('===========================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
