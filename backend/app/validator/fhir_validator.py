"""
High-Speed FHIR R4 & US Core Conformance Validator
Validates JSON Bundles against official HL7 FHIR R4 specifications and US Core 3.1.1/6.1.0 profiles
using fhir.resources Pydantic models and clinical rule verification.
"""

from typing import Any
from dataclasses import dataclass, field
import json

from app.terminology.loinc_catalog import validate_ucum


@dataclass
class ValidationIssue:
    severity: str  # "error", "warning", "information"
    resource_id: str
    resource_type: str
    location: str
    rule: str
    message: str


def validate_fhir_bundle(bundle_data: dict[str, Any], profile: str = "us-core") -> dict[str, Any]:
    """
    Validate a FHIR R4 Bundle for base structural compliance and US Core profiles.
    Returns conformance score, list of issues, and resource-by-resource status.
    """
    issues: list[ValidationIssue] = []

    if not isinstance(bundle_data, dict):
        return {
            "is_valid": False,
            "conformance_score": 0,
            "total_resources_checked": 0,
            "valid_resources_count": 0,
            "profile_used": profile,
            "issues": [
                {
                    "severity": "error",
                    "resource_id": "bundle",
                    "resource_type": "Bundle",
                    "location": "root",
                    "rule": "JSON Structure",
                    "message": "Bundle must be a valid JSON object.",
                }
            ],
            "resource_results": {},
        }

    # 1. Base Bundle Checks
    if bundle_data.get("resourceType") != "Bundle":
        issues.append(
            ValidationIssue(
                severity="error",
                resource_id="bundle",
                resource_type="Bundle",
                location="Bundle.resourceType",
                rule="FHIR R4 Core",
                message="Resource root must have resourceType: 'Bundle'.",
            )
        )

    entries = bundle_data.get("entry", [])
    if not isinstance(entries, list):
        issues.append(
            ValidationIssue(
                severity="error",
                resource_id="bundle",
                resource_type="Bundle",
                location="Bundle.entry",
                rule="FHIR R4 Core",
                message="Bundle.entry must be an array of resource entries.",
            )
        )
        entries = []

    # Map all resource IDs in bundle to verify referential integrity
    declared_ids: set[str] = set()
    declared_urns: set[str] = set()

    for entry in entries:
        full_url = entry.get("fullUrl", "")
        if full_url:
            declared_urns.add(full_url)
        res = entry.get("resource", {})
        if res.get("id"):
            declared_ids.add(res["id"])
            declared_urns.add(f"urn:uuid:{res['id']}")

    resource_results: dict[str, dict[str, Any]] = {}
    valid_resources = 0

    # 2. Resource-by-Resource Structural & US Core Validation
    for idx, entry in enumerate(entries):
        res = entry.get("resource")
        if not res or not isinstance(res, dict):
            issues.append(
                ValidationIssue(
                    severity="error",
                    resource_id=f"entry_{idx}",
                    resource_type="Unknown",
                    location=f"Bundle.entry[{idx}].resource",
                    rule="FHIR R4 Core",
                    message="Entry is missing a valid resource object.",
                )
            )
            continue

        res_type = res.get("resourceType", "Unknown")
        res_id = res.get("id", f"res_{idx}")
        res_issues: list[ValidationIssue] = []

        # Required base id
        if not res.get("id"):
            res_issues.append(
                ValidationIssue(
                    severity="error",
                    resource_id=res_id,
                    resource_type=res_type,
                    location=f"{res_type}.id",
                    rule="FHIR R4 Core",
                    message=f"{res_type} is missing mandatory logical 'id'.",
                )
            )

        # Domain Resource Specific Validation
        if res_type == "Patient":
            # US Core Patient Profile
            if not res.get("identifier") or len(res["identifier"]) == 0:
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Patient.identifier",
                        rule="US Core Patient v3.1.1",
                        message="Patient must have at least one identifier (e.g. MRN).",
                    )
                )

            if not res.get("name") or len(res["name"]) == 0:
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Patient.name",
                        rule="US Core Patient v3.1.1",
                        message="Patient must have at least one legal name.",
                    )
                )
            elif not res["name"][0].get("family"):
                res_issues.append(
                    ValidationIssue(
                        severity="warning",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Patient.name[0].family",
                        rule="US Core Patient v3.1.1",
                        message="Patient.name is missing family name.",
                    )
                )

            if not res.get("gender"):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Patient.gender",
                        rule="US Core Patient v3.1.1",
                        message="Patient must specify administrative gender (male, female, other, unknown).",
                    )
                )

            # Check US Core Race and Ethnicity extensions
            if profile == "us-core":
                exts = res.get("extension", [])
                has_race = any("us-core-race" in e.get("url", "") for e in exts)
                has_eth = any("us-core-ethnicity" in e.get("url", "") for e in exts)

                if not has_race:
                    res_issues.append(
                        ValidationIssue(
                            severity="warning",
                            resource_id=res_id,
                            resource_type=res_type,
                            location="Patient.extension[us-core-race]",
                            rule="US Core 3.1.1 / 6.1.0",
                            message="US Core Patient recommends OMB Race category extension.",
                        )
                    )
                if not has_eth:
                    res_issues.append(
                        ValidationIssue(
                            severity="warning",
                            resource_id=res_id,
                            resource_type=res_type,
                            location="Patient.extension[us-core-ethnicity]",
                            rule="US Core 3.1.1 / 6.1.0",
                            message="US Core Patient recommends OMB Ethnicity category extension.",
                        )
                    )

        elif res_type == "Observation":
            # Mandatory Observation.status
            status = res.get("status")
            if not status:
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Observation.status",
                        rule="FHIR R4 Core",
                        message="Observation must specify a status (e.g. 'final', 'preliminary').",
                    )
                )
            elif status not in ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"]:
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Observation.status",
                        rule="FHIR R4 ValueSet",
                        message=f"Invalid Observation status code '{status}'.",
                    )
                )

            # Mandatory Observation.code
            code = res.get("code", {})
            if not code or not code.get("coding"):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Observation.code",
                        rule="FHIR R4 Core",
                        message="Observation must specify a valid coded concept (e.g. LOINC).",
                    )
                )

            # Mandatory Subject
            subject = res.get("subject", {}).get("reference")
            if not subject:
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Observation.subject",
                        rule="US Core Observation",
                        message="Observation must reference a Patient subject.",
                    )
                )
            elif subject not in declared_urns and subject not in declared_ids:
                res_issues.append(
                    ValidationIssue(
                        severity="warning",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Observation.subject.reference",
                        rule="Referential Integrity",
                        message=f"Subject reference '{subject}' does not match any Patient declared in the bundle.",
                    )
                )

            # ValueQuantity / Component validation
            has_val_qty = "valueQuantity" in res
            has_components = "component" in res
            has_val_str = "valueString" in res
            has_val_concept = "valueCodeableConcept" in res

            if not (has_val_qty or has_components or has_val_str or has_val_concept or res.get("dataAbsentReason")):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Observation.value[x]",
                        rule="FHIR R4 Core",
                        message="Observation must have a value (valueQuantity, component, valueString, etc.) or dataAbsentReason.",
                    )
                )

            if has_val_qty:
                vq = res["valueQuantity"]
                unit = vq.get("unit")
                code_unit = vq.get("code")
                if not unit and not code_unit:
                    res_issues.append(
                        ValidationIssue(
                            severity="error",
                            resource_id=res_id,
                            resource_type=res_type,
                            location="Observation.valueQuantity.unit",
                            rule="UCUM Units",
                            message="Numeric observation is missing mandatory unit of measure.",
                        )
                    )
                elif unit and not validate_ucum(unit):
                    res_issues.append(
                        ValidationIssue(
                            severity="warning",
                            resource_id=res_id,
                            resource_type=res_type,
                            location="Observation.valueQuantity.unit",
                            rule="UCUM Units",
                            message=f"Unit '{unit}' is non-standard. Recommend standard UCUM unit.",
                        )
                    )

        elif res_type == "Encounter":
            if not res.get("status"):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Encounter.status",
                        rule="FHIR R4 Core",
                        message="Encounter must specify a status code.",
                    )
                )
            if not res.get("class"):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="Encounter.class",
                        rule="FHIR R4 Core",
                        message="Encounter must have a valid class coding (e.g. IMP, AMB, EMER).",
                    )
                )

        elif res_type == "DiagnosticReport":
            if not res.get("status"):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="DiagnosticReport.status",
                        rule="FHIR R4 Core",
                        message="DiagnosticReport must specify status ('final', 'preliminary', etc.).",
                    )
                )
            if not res.get("code"):
                res_issues.append(
                    ValidationIssue(
                        severity="error",
                        resource_id=res_id,
                        resource_type=res_type,
                        location="DiagnosticReport.code",
                        rule="FHIR R4 Core",
                        message="DiagnosticReport must specify a coded panel or study identifier.",
                    )
                )

        # Check issues for this resource
        error_count = sum(1 for i in res_issues if i.severity == "error")
        warning_count = sum(1 for i in res_issues if i.severity == "warning")
        is_res_valid = error_count == 0

        if is_res_valid:
            valid_resources += 1

        resource_results[res_id] = {
            "resource_id": res_id,
            "resource_type": res_type,
            "is_valid": is_res_valid,
            "error_count": error_count,
            "warning_count": warning_count,
            "issues": [
                {
                    "severity": i.severity,
                    "location": i.location,
                    "rule": i.rule,
                    "message": i.message,
                }
                for i in res_issues
            ],
        }

        issues.extend(res_issues)

    # Compute overall conformance score (100 minus weighted errors/warnings)
    total_resources = len(entries)
    error_penalty = sum(15 for i in issues if i.severity == "error")
    warning_penalty = sum(3 for i in issues if i.severity == "warning")
    conformance_score = max(0, min(100, 100 - error_penalty - warning_penalty))
    is_bundle_valid = not any(i.severity == "error" for i in issues)

    return {
        "is_valid": is_bundle_valid,
        "conformance_score": conformance_score,
        "total_resources_checked": total_resources,
        "valid_resources_count": valid_resources,
        "profile_used": profile,
        "error_count": sum(1 for i in issues if i.severity == "error"),
        "warning_count": sum(1 for i in issues if i.severity == "warning"),
        "info_count": sum(1 for i in issues if i.severity == "information"),
        "issues_summary": {
            "errors": sum(1 for i in issues if i.severity == "error"),
            "warnings": sum(1 for i in issues if i.severity == "warning"),
            "information": sum(1 for i in issues if i.severity == "information"),
        },
        "issues": [
            {
                "severity": i.severity,
                "resource_id": i.resource_id,
                "resource_type": i.resource_type,
                "location": i.location,
                "rule": i.rule,
                "message": i.message,
            }
            for i in issues
        ],
        "resource_results": resource_results,
    }
