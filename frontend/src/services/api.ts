/**
 * SemantiCare Intelligent Hybrid API Service.
 * Attempts communication with the live FastAPI backend (http://127.0.0.1:8000/api/v1).
 * If the backend is running, uses high-performance Python services.
 * If the backend is unreachable (standalone, demo, or offline), seamlessly falls back
 * to the zero-dependency in-browser TypeScript engine.
 */

import type { HL7Sample, ParseHL7Response, MapHL7Response, ValidationResult, MappingRule } from '../types/hl7';
import { parseHl7Message } from '../engine/hl7Parser';
import { getAllSamples } from '../engine/sampleMessages';
import { scrubHl7Message, TokenVault } from '../engine/phiScrubber';
import { SemanticMapper } from '../engine/mapper';
import { lookupLoinc, matchTerminology } from '../engine/loincCatalog';
import { validateFhirBundle } from '../engine/fhirValidator';
import {
  loadRules,
  storeRules,
  saveRule,
  deleteRule,
  exportRulesConceptMapJson,
} from '../engine/rulesStore';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export type EngineMode = 'backend' | 'browser';
export type EnginePreference = 'auto' | 'backend' | 'browser';

export interface HealthStatus {
  status: string;
  engine_mode: EngineMode;
  phases_active: number[];
  features: string[];
  service?: string;
}

export interface EngineTelemetry {
  activeMode: EngineMode;
  preference: EnginePreference;
  pingMs: number;
  apiBase: string;
  isBackendAvailable: boolean;
  serviceName: string;
  features: string[];
}

let activeEngineMode: EngineMode = 'browser';
let enginePreference: EnginePreference = 'auto';
let lastPingMs: number = 0;
let isBackendAvailable: boolean = false;
let backendFeatures: string[] = [];

export function getActiveEngineMode(): EngineMode {
  return activeEngineMode;
}

export function getEnginePreference(): EnginePreference {
  return enginePreference;
}

export function setEnginePreference(pref: EnginePreference): EngineMode {
  enginePreference = pref;
  if (pref === 'browser') {
    activeEngineMode = 'browser';
  } else if (pref === 'backend') {
    activeEngineMode = isBackendAvailable ? 'backend' : 'browser';
  } else {
    // auto
    activeEngineMode = isBackendAvailable ? 'backend' : 'browser';
  }
  return activeEngineMode;
}

export function getEngineTelemetry(): EngineTelemetry {
  return {
    activeMode: activeEngineMode,
    preference: enginePreference,
    pingMs: lastPingMs,
    apiBase: API_BASE,
    isBackendAvailable,
    serviceName: activeEngineMode === 'backend' ? 'FastAPI Python Engine' : 'In-Browser Standalone Engine',
    features: activeEngineMode === 'backend' && backendFeatures.length ? backendFeatures : [
      'Deterministic HL7 v2 Segment & Field Parser',
      'Zero-Trust Client PHI Token Vault',
      'Clinical NLP & NTE Entity Extractor',
      'US Core 3.1.1 & FHIR R4 Schema Validator',
      'Local Storage Institutional Mapping Memory',
    ],
  };
}

export async function fetchHealth(): Promise<HealthStatus> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timer);
    lastPingMs = Math.round(performance.now() - start);
    if (res.ok) {
      const data = await res.json();
      isBackendAvailable = true;
      backendFeatures = data.features || [];
      activeEngineMode = enginePreference === 'browser' ? 'browser' : 'backend';
      return {
        status: data.status || 'online',
        engine_mode: activeEngineMode,
        phases_active: data.phases_active || [1, 2, 3, 4, 5],
        features: backendFeatures,
        service: data.service || 'FastAPI Cloud/Local Backend',
      };
    }
  } catch {
    lastPingMs = -1;
    isBackendAvailable = false;
  }

  activeEngineMode = 'browser';
  return {
    status: 'online',
    engine_mode: 'browser',
    phases_active: [1, 2, 3, 4, 5],
    features: [
      'Client-Side In-Browser HL7 v2 Parser & Semantic Mapper',
      'Zero-Trust Client PHI Token Vault',
      'Clinical NLP & NTE Entity Extractor (Browser Regex Engine)',
      'US Core 3.1.1 & FHIR R4 Schema Validator',
      'Local Storage Institutional Mapping Memory',
    ],
    service: 'In-Browser Standalone Engine',
  };
}

export async function fetchSamples(): Promise<HL7Sample[]> {
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${API_BASE}/samples`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.samples) && data.samples.length > 0) {
          return data.samples;
        }
      }
    } catch {
      // Fall back
    }
  }
  return getAllSamples();
}

export async function parseHL7(raw_hl7: string): Promise<ParseHL7Response> {
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_hl7 }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall back to local parser
    }
  }

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
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE}/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_hl7, enable_phi_scrubbing }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall back
    }
  }

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
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE}/fhir/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle, profile }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall back
    }
  }

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
  // Try via backend proxy first to avoid browser CORS issues
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_BASE}/fhir/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle, fhir_server_url, auth_token }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Direct browser fallback
    }
  }

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

export async function fetchMappingRules(facility?: string): Promise<{ count: number; facility_filter?: string; rules: MappingRule[] }> {
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const url = facility ? `${API_BASE}/rules/?facility=${encodeURIComponent(facility)}` : `${API_BASE}/rules/`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rules)) {
          storeRules(data.rules);
        }
        return data;
      }
    } catch {
      // Fall back
    }
  }

  let rules = loadRules();
  if (facility) {
    const f = facility.trim().toUpperCase();
    rules = rules.filter((r) => r.facility === f || r.facility === '*');
  }
  return { count: rules.length, facility_filter: facility, rules };
}

export async function saveMappingRule(rule: Partial<MappingRule>): Promise<{ success: boolean; rule: MappingRule; message: string }> {
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${API_BASE}/rules/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        saveRule(data.rule || rule);
        return data;
      }
    } catch {
      // Fall back
    }
  }

  const { saved, isNew } = saveRule(rule);
  return { success: true, rule: saved, message: isNew ? 'Rule saved.' : 'Rule updated.' };
}

export async function deleteMappingRule(ruleId: string): Promise<{ success: boolean; deleted_id: string; message: string }> {
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${API_BASE}/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        deleteRule(ruleId);
        return data;
      }
    } catch {
      // Fall back
    }
  }

  const ok = deleteRule(ruleId);
  if (!ok) throw new Error('Rule not found');
  return { success: true, deleted_id: ruleId, message: 'Rule deleted.' };
}

export async function exportRulesConceptMap(): Promise<any> {
  if (activeEngineMode === 'backend') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/rules/conceptmap`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall back
    }
  }

  return exportRulesConceptMapJson();
}
