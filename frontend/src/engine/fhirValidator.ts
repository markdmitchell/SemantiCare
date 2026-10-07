/**
 * High-Speed FHIR R4 & US Core Conformance Validator
 * Ported 1:1 from backend/app/validator/fhir_validator.py
 */
import { validateUcum } from './loincCatalog';
import type { ValidationIssue, ValidationResult } from '../types/hl7';

export function validateFhirBundle(bundleData: any, profile: string = 'us-core'): ValidationResult & {
  error_count: number;
  warning_count: number;
  info_count: number;
} {
  const issues: ValidationIssue[] = [];

  if (typeof bundleData !== 'object' || bundleData === null || Array.isArray(bundleData)) {
    return {
      is_valid: false,
      conformance_score: 0,
      total_resources_checked: 0,
      valid_resources_count: 0,
      profile_used: profile,
      error_count: 1,
      warning_count: 0,
      info_count: 0,
      issues_summary: { errors: 1, warnings: 0, information: 0 },
      issues: [
        {
          severity: 'error',
          resource_id: 'bundle',
          resource_type: 'Bundle',
          location: 'root',
          rule: 'JSON Structure',
          message: 'Bundle must be a valid JSON object.',
        },
      ],
      resource_results: {},
    } as any;
  }

  if (bundleData.resourceType !== 'Bundle') {
    issues.push({
      severity: 'error',
      resource_id: 'bundle',
      resource_type: 'Bundle',
      location: 'Bundle.resourceType',
      rule: 'FHIR R4 Core',
      message: "Resource root must have resourceType: 'Bundle'.",
    });
  }

  let entries: any[] = bundleData.entry ?? [];
  if (!Array.isArray(entries)) {
    issues.push({
      severity: 'error',
      resource_id: 'bundle',
      resource_type: 'Bundle',
      location: 'Bundle.entry',
      rule: 'FHIR R4 Core',
      message: 'Bundle.entry must be an array of resource entries.',
    });
    entries = [];
  }

  const declaredIds = new Set<string>();
  const declaredUrns = new Set<string>();

  for (const entry of entries) {
    const fullUrl = entry?.fullUrl ?? '';
    if (fullUrl) declaredUrns.add(fullUrl);
    const res = entry?.resource ?? {};
    if (res?.id) {
      declaredIds.add(res.id);
      declaredUrns.add(`urn:uuid:${res.id}`);
    }
  }

  const resourceResults: Record<string, any> = {};
  let validResources = 0;

  entries.forEach((entry, idx) => {
    const res = entry?.resource;
    if (!res || typeof res !== 'object') {
      issues.push({
        severity: 'error',
        resource_id: `entry_${idx}`,
        resource_type: 'Unknown',
        location: `Bundle.entry[${idx}].resource`,
        rule: 'FHIR R4 Core',
        message: 'Entry is missing a valid resource object.',
      });
      return;
    }

    const resType = res.resourceType ?? 'Unknown';
    const resId = res.id ?? `res_${idx}`;
    const resIssues: ValidationIssue[] = [];

    if (!res.id) {
      resIssues.push({
        severity: 'error',
        resource_id: resId,
        resource_type: resType,
        location: `${resType}.id`,
        rule: 'FHIR R4 Core',
        message: `${resType} is missing mandatory logical 'id'.`,
      });
    }

    if (resType === 'Patient') {
      if (!res.identifier || res.identifier.length === 0) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Patient.identifier',
          rule: 'US Core Patient v3.1.1',
          message: 'Patient must have at least one identifier (e.g. MRN).',
        });
      }

      if (!res.name || res.name.length === 0) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Patient.name',
          rule: 'US Core Patient v3.1.1',
          message: 'Patient must have at least one legal name.',
        });
      } else if (!res.name[0]?.family) {
        resIssues.push({
          severity: 'warning',
          resource_id: resId,
          resource_type: resType,
          location: 'Patient.name[0].family',
          rule: 'US Core Patient v3.1.1',
          message: 'Patient.name is missing family name.',
        });
      }

      if (!res.gender) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Patient.gender',
          rule: 'US Core Patient v3.1.1',
          message: 'Patient must specify administrative gender (male, female, other, unknown).',
        });
      }

      if (profile === 'us-core') {
        const exts: any[] = res.extension ?? [];
        const hasRace = exts.some((e) => (e?.url ?? '').includes('us-core-race'));
        const hasEth = exts.some((e) => (e?.url ?? '').includes('us-core-ethnicity'));

        if (!hasRace) {
          resIssues.push({
            severity: 'warning',
            resource_id: resId,
            resource_type: resType,
            location: 'Patient.extension[us-core-race]',
            rule: 'US Core 3.1.1 / 6.1.0',
            message: 'US Core Patient recommends OMB Race category extension.',
          });
        }
        if (!hasEth) {
          resIssues.push({
            severity: 'warning',
            resource_id: resId,
            resource_type: resType,
            location: 'Patient.extension[us-core-ethnicity]',
            rule: 'US Core 3.1.1 / 6.1.0',
            message: 'US Core Patient recommends OMB Ethnicity category extension.',
          });
        }
      }
    } else if (resType === 'Observation') {
      const status = res.status;
      if (!status) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Observation.status',
          rule: 'FHIR R4 Core',
          message: "Observation must specify a status (e.g. 'final', 'preliminary').",
        });
      } else if (
        !['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'].includes(status)
      ) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Observation.status',
          rule: 'FHIR R4 ValueSet',
          message: `Invalid Observation status code '${status}'.`,
        });
      }

      const code = res.code ?? {};
      if (!code || !code.coding) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Observation.code',
          rule: 'FHIR R4 Core',
          message: 'Observation must specify a valid coded concept (e.g. LOINC).',
        });
      }

      const subject = res.subject?.reference;
      if (!subject) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Observation.subject',
          rule: 'US Core Observation',
          message: 'Observation must reference a Patient subject.',
        });
      } else if (!declaredUrns.has(subject) && !declaredIds.has(subject)) {
        resIssues.push({
          severity: 'warning',
          resource_id: resId,
          resource_type: resType,
          location: 'Observation.subject.reference',
          rule: 'Referential Integrity',
          message: `Subject reference '${subject}' does not match any Patient declared in the bundle.`,
        });
      }

      const hasValQty = 'valueQuantity' in res;
      const hasComponents = 'component' in res;
      const hasValStr = 'valueString' in res;
      const hasValConcept = 'valueCodeableConcept' in res;

      if (!(hasValQty || hasComponents || hasValStr || hasValConcept || res.dataAbsentReason)) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Observation.value[x]',
          rule: 'FHIR R4 Core',
          message: 'Observation must have a value (valueQuantity, component, valueString, etc.) or dataAbsentReason.',
        });
      }

      if (hasValQty) {
        const vq = res.valueQuantity;
        const unit = vq?.unit;
        const codeUnit = vq?.code;
        if (!unit && !codeUnit) {
          resIssues.push({
            severity: 'error',
            resource_id: resId,
            resource_type: resType,
            location: 'Observation.valueQuantity.unit',
            rule: 'UCUM Units',
            message: 'Numeric observation is missing mandatory unit of measure.',
          });
        } else if (unit && !validateUcum(unit)) {
          resIssues.push({
            severity: 'warning',
            resource_id: resId,
            resource_type: resType,
            location: 'Observation.valueQuantity.unit',
            rule: 'UCUM Units',
            message: `Unit '${unit}' is non-standard. Recommend standard UCUM unit.`,
          });
        }
      }
    } else if (resType === 'Encounter') {
      if (!res.status) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Encounter.status',
          rule: 'FHIR R4 Core',
          message: 'Encounter must specify a status code.',
        });
      }
      if (!res.class) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'Encounter.class',
          rule: 'FHIR R4 Core',
          message: 'Encounter must have a valid class coding (e.g. IMP, AMB, EMER).',
        });
      }
    } else if (resType === 'DiagnosticReport') {
      if (!res.status) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'DiagnosticReport.status',
          rule: 'FHIR R4 Core',
          message: "DiagnosticReport must specify status ('final', 'preliminary', etc.).",
        });
      }
      if (!res.code) {
        resIssues.push({
          severity: 'error',
          resource_id: resId,
          resource_type: resType,
          location: 'DiagnosticReport.code',
          rule: 'FHIR R4 Core',
          message: 'DiagnosticReport must specify a coded panel or study identifier.',
        });
      }
    }

    const errorCount = resIssues.filter((i) => i.severity === 'error').length;
    const warningCount = resIssues.filter((i) => i.severity === 'warning').length;
    const isResValid = errorCount === 0;

    if (isResValid) validResources += 1;

    resourceResults[resId] = {
      resource_id: resId,
      resource_type: resType,
      is_valid: isResValid,
      error_count: errorCount,
      warning_count: warningCount,
      issues: resIssues.map((i) => ({
        severity: i.severity,
        location: i.location,
        rule: i.rule,
        message: i.message,
      })),
    };

    issues.push(...resIssues);
  });

  const totalResources = entries.length;
  const errorPenalty = issues.filter((i) => i.severity === 'error').length * 15;
  const warningPenalty = issues.filter((i) => i.severity === 'warning').length * 3;
  const conformanceScore = Math.max(0, Math.min(100, 100 - errorPenalty - warningPenalty));
  const isBundleValid = !issues.some((i) => i.severity === 'error');

  const errorCountTotal = issues.filter((i) => i.severity === 'error').length;
  const warningCountTotal = issues.filter((i) => i.severity === 'warning').length;
  const infoCountTotal = issues.filter((i) => i.severity === 'information').length;

  return {
    is_valid: isBundleValid,
    conformance_score: conformanceScore,
    total_resources_checked: totalResources,
    valid_resources_count: validResources,
    profile_used: profile,
    error_count: errorCountTotal,
    warning_count: warningCountTotal,
    info_count: infoCountTotal,
    issues_summary: {
      errors: errorCountTotal,
      warnings: warningCountTotal,
      information: infoCountTotal,
    },
    issues,
    resource_results: resourceResults,
  };
}
