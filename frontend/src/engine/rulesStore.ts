import type { MappingRule } from '../types/hl7';

const RULES_KEY = 'semanticare.mappingRules.v1';
const rid = () => `rule-${Math.random().toString(16).slice(2, 10)}`;

export function seedRules(): MappingRule[] {
  const now = new Date().toISOString();
  return [
    {
      id: rid(),
      facility: 'METRO_HEALTH',
      rule_type: 'LOCAL_TERMINOLOGY',
      source_key: 'BP_LOCAL',
      target_value: '85354-9',
      target_display: 'Blood pressure panel with all children optional',
      author: 'Clinical Informatics Governance',
      created_at: now,
      applied_count: 4,
      notes: 'Hospital default for Philips bedside telemetry monitor non-invasive blood pressure.',
    },
    {
      id: rid(),
      facility: 'METRO_HEALTH',
      rule_type: 'MISSING_UNIT',
      source_key: '29463-7',
      target_value: 'kg',
      target_display: 'Kilograms (kg)',
      author: 'Quality & Safety Committee',
      created_at: now,
      applied_count: 6,
      notes: 'Inpatient adult medical floors use calibrated metric scales; default to kg.',
    },
    {
      id: rid(),
      facility: 'METRO_CARDIO',
      rule_type: 'LOCAL_TERMINOLOGY',
      source_key: 'TROP_POC',
      target_value: '49563-0',
      target_display: 'Troponin I.cardiac [Mass/volume] in Blood by Point of care method',
      author: 'Cardiology Quality Lead',
      created_at: now,
      applied_count: 2,
      notes: 'Metro Cardiology point-of-care rapid troponin immunoassay.',
    },
  ];
}

export function loadRules(): MappingRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    /* ignore parse error */
  }
  const seeded = seedRules();
  storeRules(seeded);
  return seeded;
}

export function storeRules(rules: MappingRule[]): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* ignore quota error */
  }
}

/**
 * Searches local rules for a matching institutional mapping rule.
 * Priority 1: Facility-specific rule match
 * Priority 2: Global '*' facility fallback
 */
export function findMatchingRule(
  facility: string,
  ruleType: string,
  sourceKey: string
): MappingRule | undefined {
  const rules = loadRules();
  const normFac = (facility || '*').trim().toUpperCase();
  const normType = ruleType.trim().toUpperCase();
  const normSource = sourceKey.trim();

  // Priority 1: Exact facility match
  const exact = rules.find(
    (r) =>
      r.facility.trim().toUpperCase() === normFac &&
      r.rule_type.trim().toUpperCase() === normType &&
      r.source_key.trim() === normSource
  );
  if (exact) return exact;

  // Priority 2: Global fallback
  if (normFac !== '*') {
    return rules.find(
      (r) =>
        r.facility === '*' &&
        r.rule_type.trim().toUpperCase() === normType &&
        r.source_key.trim() === normSource
    );
  }

  return undefined;
}

export function incrementRuleUsage(ruleId: string): void {
  const rules = loadRules();
  const rule = rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.applied_count = (rule.applied_count || 0) + 1;
    storeRules(rules);
  }
}

export function saveRule(rule: Partial<MappingRule>): { saved: MappingRule; isNew: boolean } {
  const rules = loadRules();
  const facility = rule.facility?.trim() ? rule.facility.trim().toUpperCase() : '*';
  const rule_type = rule.rule_type ?? 'LOCAL_TERMINOLOGY';
  const source_key = (rule.source_key ?? '').trim();

  const existing = rules.find(
    (r) =>
      r.facility === facility &&
      r.rule_type === rule_type &&
      r.source_key === source_key
  );

  let saved: MappingRule;
  let isNew = false;

  if (existing) {
    Object.assign(existing, {
      target_value: rule.target_value ?? existing.target_value,
      target_display: rule.target_display || existing.target_display,
      author: rule.author || existing.author,
      notes: rule.notes ?? existing.notes,
    });
    saved = existing;
  } else {
    saved = {
      id: rid(),
      facility,
      rule_type,
      source_key,
      target_value: rule.target_value ?? '',
      target_display: rule.target_display || rule.target_value || '',
      author: rule.author || 'Clinical Informaticist',
      created_at: new Date().toISOString(),
      applied_count: 0,
      notes: rule.notes ?? '',
    };
    rules.push(saved);
    isNew = true;
  }

  storeRules(rules);
  return { saved, isNew };
}

export function deleteRule(ruleId: string): boolean {
  const rules = loadRules();
  const next = rules.filter((r) => r.id !== ruleId);
  if (next.length === rules.length) return false;
  storeRules(next);
  return true;
}

export function exportRulesConceptMapJson(): any {
  const rules = loadRules().filter((r) => r.rule_type === 'LOCAL_TERMINOLOGY');
  const groups: Record<string, any[]> = {};
  for (const r of rules) {
    (groups[r.facility] ??= []).push({
      code: r.source_key,
      target: [
        {
          code: r.target_value,
          display: r.target_display,
          equivalence: 'equivalent',
          comment: r.notes || undefined,
        },
      ],
    });
  }
  return {
    resourceType: 'ConceptMap',
    id: 'semanticare-institutional-rules',
    title: 'SemantiCare Institutional Terminology ConceptMap',
    status: 'active',
    date: new Date().toISOString().slice(0, 10),
    publisher: 'SemantiCare Clinical Informatics',
    group: Object.entries(groups).map(([facility, element]) => ({
      source: `urn:semanticare:facility:${facility}`,
      target: 'http://loinc.org',
      element,
    })),
  };
}
