/**
 * Local in-browser engine API surface.
 * Replicates backend/app/api/routes.py response shapes using the TS engine port,
 * running fully client-side (no network calls except pushBundleToFHIRServer).
 */
import type { HL7Sample, ParseHL7Response, MapHL7Response, ValidationResult } from '../types/hl7';
import { parseHl7Message } from '../engine/hl7Parser';
import { getAllSamples } from '../engine/sampleMessages';
import { scrubHl7Message, TokenVault } from '../engine/phiScrubber';
import { SemanticMapper } from '../engine/mapper';
import { lookupLoinc, matchTerminology } from '../engine/loincCatalog';
import { validateFhirBundle } from '../engine/fhirValidator';

export async function fetchHealth(): Promise<{ status: string; phases_active: number[]; features: string[] }> {
  return {
    status: 'online',
    phases_active: [1, 2, 3, 4, 5],
    features: [
      'Deterministic HL7 v2 Segment & Field Parser',
      'HL7 Standard Metadata Dictionary',
      'Zero-Trust Reversible PHI Scrubber (Token Vault)',
      'Semantic FHIR R4 Translation Engine (Patient, Encounter, Observation, DiagnosticReport, Condition, Coverage)',
      'LOINC Top-Lab & UCUM Terminology Grounding',
      'Human-in-the-Loop Ambiguity Resolution & In-Memory Updates',
      'FHIR R4 Schema & US Core 3.1.1/6.1.0 Conformance Validator',
      'Bulk NDJSON & Re-Hydrated PHI Export Pipeline',
      'Enterprise Multi-Message Batch Processing & FHIR Store Push Endpoint',
      'Docker Multi-Stage Containerization Architecture',
    ],
  };
}

export async function fetchSamples(): Promise<HL7Sample[]> {
  return getAllSamples();
}

export async function parseHL7(raw_hl7: string): Promise<ParseHL7Response> {
  try {
    const result = parseHl7Message(raw_hl7);
    return {
      success: result.is_valid,
      is_valid: result.is_valid,
      metadata: result.metadata,
      segments: result.segments,
      error: result.error,
    };
  } catch (e: any) {
    return {
      success: false,
      is_valid: false,
      metadata: {} as any,
      segments: [],
      error: String(e?.message ?? e),
    };
  }
}

/** Internal pipeline mirroring process_single_hl7_message from routes.py */
export function processSingleHl7Message(rawInput: string, enablePhiScrubbing: boolean = true): MapHL7Response {
  const cleanInput = rawInput.trim();
  if (!cleanInput) {
    throw new Error('Empty HL7 payload provided.');
  }

  let scrubbedHl7: string;
  let vault: TokenVault;
  if (enablePhiScrubbing) {
    const result = scrubHl7Message(cleanInput);
    scrubbedHl7 = result.scrubbed;
    vault = result.vault;
  } else {
    scrubbedHl7 = cleanInput;
    vault = new TokenVault();
  }

  const parsed = parseHl7Message(scrubbedHl7);
  if (!parsed.is_valid) {
    return {
      success: false,
      fhir_bundle: {},
      rehydrated_bundle: {},
      phi_audit: vault.toAuditDict(),
      confidence_score: 0,
      confidence_counts: {},
      resource_confidences: {},
      ambiguities: [],
      lineage: [],
      total_resources: 0,
      resource_types: [],
      error: parsed.error ?? 'Failed to parse HL7 structure.',
    };
  }

  const mapper = new SemanticMapper();
  const mappingResult = mapper.buildBundle({ segments: parsed.segments }, vault);

  return {
    success: true,
    fhir_bundle: mappingResult.bundle,
    rehydrated_bundle: mappingResult.rehydrated_bundle,
    phi_audit: vault.toAuditDict(),
    confidence_score: mappingResult.confidence_score,
    confidence_counts: mappingResult.confidence_counts,
    resource_confidences: mappingResult.resource_confidences ?? {},
    ambiguities: mappingResult.ambiguities,
    lineage: mappingResult.lineage,
    total_resources: mappingResult.total_resources,
    resource_types: mappingResult.resource_types,
    error: undefined,
  };
}

export async function mapHL7(raw_hl7: string, enable_phi_scrubbing: boolean = true): Promise<MapHL7Response> {
  try {
    return processSingleHl7Message(raw_hl7, enable_phi_scrubbing);
  } catch (e: any) {
    return {
      success: false,
      fhir_bundle: {},
      rehydrated_bundle: {},
      phi_audit: {} as any,
      confidence_score: 0,
      confidence_counts: {},
      ambiguities: [],
      lineage: [],
      total_resources: 0,
      resource_types: [],
      error: String(e?.message ?? e),
    };
  }
}

export async function validateFHIRBundle(bundle: any, profile: string = 'us-core'): Promise<ValidationResult> {
  return validateFhirBundle(bundle, profile) as unknown as ValidationResult;
}

export async function pushBundleToFHIRServer(
  bundle: any,
  fhir_server_url: string,
  auth_token?: string
): Promise<{
  success: boolean;
  status_code: number;
  target_url: string;
  response_body?: string;
  message?: string;
  error?: string;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/fhir+json',
    Accept: 'application/fhir+json',
  };
  if (auth_token) {
    headers['Authorization'] = `Bearer ${auth_token.trim()}`;
  }

  const targetUrl = fhir_server_url.trim().replace(/\/+$/, '');

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bundle),
    });
    const text = await response.text();
    return {
      success: response.ok,
      status_code: response.status,
      target_url: targetUrl,
      response_body: text.slice(0, 2000),
      message: `Server responded with HTTP ${response.status}`,
    };
  } catch (exc: any) {
    return {
      success: false,
      status_code: 0,
      target_url: targetUrl,
      error: `Failed to connect to FHIR server: ${String(exc?.message ?? exc)}`,
    };
  }
}

export { lookupLoinc, matchTerminology };
