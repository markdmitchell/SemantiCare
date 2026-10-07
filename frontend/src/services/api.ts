import type { HL7Sample, ParseHL7Response, MapHL7Response, ValidationResult, MappingRule } from '../types/hl7';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; phases_active: number[]; features: string[] }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Failed to fetch health check: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSamples(): Promise<HL7Sample[]> {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) {
    throw new Error(`Failed to fetch samples: ${res.statusText}`);
  }
  const data = await res.json();
  return data.samples;
}

export async function parseHL7(raw_hl7: string): Promise<ParseHL7Response> {
  const res = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw_hl7 }),
  });
  if (!res.ok) {
    throw new Error(`API error (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function mapHL7(raw_hl7: string, enable_phi_scrubbing: boolean = true): Promise<MapHL7Response> {
  const res = await fetch(`${API_BASE}/map`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw_hl7, enable_phi_scrubbing }),
  });
  if (!res.ok) {
    throw new Error(`API error (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function validateFHIRBundle(bundle: any, profile: string = 'us-core'): Promise<ValidationResult> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bundle, profile }),
  });
  if (!res.ok) {
    throw new Error(`Validation API error (${res.status}): ${res.statusText}`);
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/fhir/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bundle, fhir_server_url, auth_token }),
  });
  if (!res.ok) {
    throw new Error(`FHIR Push API error (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMappingRules(facility?: string): Promise<{ count: number; facility_filter?: string; rules: MappingRule[] }> {
  const url = facility ? `${API_BASE}/rules?facility=${encodeURIComponent(facility)}` : `${API_BASE}/rules`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Rules API error (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function saveMappingRule(rule: Partial<MappingRule>): Promise<{ success: boolean; rule: MappingRule; message: string }> {
  const res = await fetch(`${API_BASE}/rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });
  if (!res.ok) {
    throw new Error(`Failed to save mapping rule (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function deleteMappingRule(ruleId: string): Promise<{ success: boolean; deleted_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete mapping rule (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export async function exportRulesConceptMap(): Promise<any> {
  const res = await fetch(`${API_BASE}/rules/export`);
  if (!res.ok) {
    throw new Error(`Failed to export ConceptMap (${res.status}): ${res.statusText}`);
  }
  return res.json();
}


