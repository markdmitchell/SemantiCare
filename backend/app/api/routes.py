"""
FastAPI Routes for HL7 v2 Semantic Data Mapper - Phases 1 & 2
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any
import httpx

from app.core.hl7_parser import parse_hl7_message
from app.samples.sample_messages import get_all_samples, get_sample_by_id
from app.security.phi_scrubber import scrub_hl7_message
from app.engine.mapper import SemanticMapper
from app.terminology.loinc_catalog import match_terminology, lookup_loinc

router = APIRouter()


class ParseHL7Request(BaseModel):
    raw_hl7: str = Field(..., description="Raw HL7 v2 string content")


class ParseHL7Response(BaseModel):
    success: bool
    is_valid: bool
    metadata: dict[str, Any]
    segments: list[dict[str, Any]]
    error: str | None = None


class MapHL7Request(BaseModel):
    raw_hl7: str = Field(..., description="Raw HL7 v2 string content")
    enable_phi_scrubbing: bool = Field(default=True, description="De-identify PHI before semantic processing")


class MapHL7Response(BaseModel):
    success: bool
    fhir_bundle: dict[str, Any]
    rehydrated_bundle: dict[str, Any]
    phi_audit: dict[str, Any]
    confidence_score: int
    confidence_counts: dict[str, int]
    resource_confidences: dict[str, Any] = Field(default_factory=dict)
    ambiguities: list[dict[str, Any]]
    lineage: list[dict[str, Any]]
    total_resources: int
    resource_types: list[str]
    error: str | None = None



class TerminologyQueryRequest(BaseModel):
    query: str = Field(..., description="Search term or local code to ground")


@router.get("/health")
async def health_check():
    """Health check endpoint confirming API service status and active capabilities."""
    return {
        "status": "online",
        "service": "SemantiCare • AI-Assisted HL7 v2 to FHIR R4 Mapper API",
        "phases_active": [1, 2, 3, 4, 5],
        "features": [
            "Deterministic HL7 v2 Segment & Field Parser",
            "HL7 Standard Metadata Dictionary",
            "Zero-Trust Reversible PHI Scrubber (Token Vault)",
            "Semantic FHIR R4 Translation Engine (Patient, Encounter, Observation, DiagnosticReport, Condition, Coverage)",
            "LOINC Top-Lab & UCUM Terminology Grounding",
            "Human-in-the-Loop Ambiguity Resolution & In-Memory Updates",
            "FHIR R4 Schema & US Core 3.1.1/6.1.0 Conformance Validator",
            "Bulk NDJSON & Re-Hydrated PHI Export Pipeline",
            "Enterprise Multi-Message Batch Processing & FHIR Store Push Endpoint",
            "Docker Multi-Stage Containerization Architecture",
        ],
    }


@router.get("/samples")
async def list_sample_messages():
    """Returns curated clinical HL7 sample messages with descriptions and highlights."""
    return {
        "count": len(get_all_samples()),
        "samples": get_all_samples(),
    }


@router.get("/samples/{sample_id}")
async def get_single_sample(sample_id: str):
    """Retrieve a specific sample message by ID."""
    sample = get_sample_by_id(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")
    return sample


@router.post("/parse", response_model=ParseHL7Response)
async def parse_hl7_endpoint(payload: ParseHL7Request):
    """Parse raw HL7 v2 into annotated structural tree."""
    try:
        result = parse_hl7_message(payload.raw_hl7)
        return ParseHL7Response(
            success=result.get("is_valid", False),
            is_valid=result.get("is_valid", False),
            metadata=result.get("metadata", {}),
            segments=result.get("segments", []),
            error=result.get("error"),
        )
    except Exception as e:
        return ParseHL7Response(
            success=False,
            is_valid=False,
            metadata={},
            segments=[],
            error=str(e),
        )


def process_single_hl7_message(raw_input: str, enable_phi_scrubbing: bool = True) -> dict[str, Any]:
    """Internal pipeline executing PHI scrubbing, AST parsing, and semantic translation."""
    clean_input = raw_input.strip()
    if not clean_input:
        raise ValueError("Empty HL7 payload provided.")

    if enable_phi_scrubbing:
        scrubbed_hl7, vault = scrub_hl7_message(clean_input)
    else:
        scrubbed_hl7 = clean_input
        from app.security.phi_scrubber import TokenVault
        vault = TokenVault()

    parsed = parse_hl7_message(scrubbed_hl7)
    if not parsed.get("is_valid"):
        return {
            "success": False,
            "fhir_bundle": {},
            "rehydrated_bundle": {},
            "phi_audit": vault.to_audit_dict(),
            "confidence_score": 0,
            "confidence_counts": {},
            "ambiguities": [],
            "lineage": [],
            "total_resources": 0,
            "resource_types": [],
            "error": parsed.get("error", "Failed to parse HL7 structure."),
        }

    mapper = SemanticMapper()
    mapping_result = mapper.build_bundle(parsed, vault)

    return {
        "success": True,
        "fhir_bundle": mapping_result["bundle"],
        "rehydrated_bundle": mapping_result["rehydrated_bundle"],
        "phi_audit": vault.to_audit_dict(),
        "confidence_score": mapping_result["confidence_score"],
        "confidence_counts": mapping_result["confidence_counts"],
        "resource_confidences": mapping_result.get("resource_confidences", {}),
        "ambiguities": mapping_result["ambiguities"],
        "lineage": mapping_result["lineage"],
        "total_resources": mapping_result["total_resources"],
        "resource_types": mapping_result["resource_types"],
        "error": None,
    }


@router.post("/map", response_model=MapHL7Response)
async def map_hl7_endpoint(payload: MapHL7Request):
    """
    Translate an HL7 v2 message to a FHIR R4 Bundle with terminology grounding and confidence scoring.
    """
    try:
        res = process_single_hl7_message(payload.raw_hl7, enable_phi_scrubbing=payload.enable_phi_scrubbing)
        return MapHL7Response(**res)
    except Exception as e:
        return MapHL7Response(
            success=False,
            fhir_bundle={},
            rehydrated_bundle={},
            phi_audit={},
            confidence_score=0,
            confidence_counts={},
            ambiguities=[],
            lineage=[],
            total_resources=0,
            resource_types=[],
            error=str(e),
        )


@router.post("/terminology/lookup")
async def terminology_lookup(payload: TerminologyQueryRequest):
    """Ground and search local LOINC vocabulary dictionary."""
    grounded = lookup_loinc(payload.query)
    candidates = match_terminology(payload.query)
    return {
        "query": payload.query,
        "exact_match": grounded,
        "candidates": candidates,
    }


class ValidateFHIRRequest(BaseModel):
    bundle: dict[str, Any] = Field(..., description="FHIR R4 Bundle to validate")
    profile: str = Field(default="us-core", description="'us-core' or 'base'")


@router.post("/validate")
async def validate_bundle_endpoint(payload: ValidateFHIRRequest):
    """
    Validate a FHIR R4 Bundle against base specifications and US Core 3.1.1/6.1.0 profiles.
    Returns conformance score, issue list with locations, and resource-by-resource status.
    """
    from app.validator.fhir_validator import validate_fhir_bundle
    result = validate_fhir_bundle(payload.bundle, profile=payload.profile)
    return result


class BatchMapHL7Request(BaseModel):
    messages: list[str] = Field(..., description="Array of raw HL7 v2 messages")
    enable_phi_scrubbing: bool = Field(default=True, description="De-identify PHI across all messages")


@router.post("/batch/map")
async def batch_map_endpoint(payload: BatchMapHL7Request):
    """
    Batch process an array of HL7 v2 messages.
    Returns individual mapped bundles and aggregate pipeline metrics.
    """
    results = []
    total_resources = 0
    total_ambiguities = 0
    total_redactions = 0
    confidence_sum = 0

    for idx, raw_msg in enumerate(payload.messages):
        clean_msg = raw_msg.strip()
        if not clean_msg:
            continue
        try:
            m_res = process_single_hl7_message(clean_msg, enable_phi_scrubbing=payload.enable_phi_scrubbing)
            total_resources += m_res.get("total_resources", 0)
            total_ambiguities += len(m_res.get("ambiguities", []))
            total_redactions += m_res.get("phi_audit", {}).get("total_redactions", 0)
            confidence_sum += m_res.get("confidence_score", 0)
            results.append({
                "message_index": idx,
                "success": True,
                "bundle_id": m_res.get("fhir_bundle", {}).get("id"),
                "total_resources": m_res.get("total_resources", 0),
                "confidence_score": m_res.get("confidence_score", 0),
                "ambiguities_count": len(m_res.get("ambiguities", [])),
                "fhir_bundle": m_res.get("fhir_bundle"),
            })
        except Exception as e:
            results.append({
                "message_index": idx,
                "success": False,
                "error": str(e),
            })

    num_successful = sum(1 for r in results if r.get("success"))
    avg_confidence = round(confidence_sum / max(1, num_successful)) if num_successful > 0 else 0

    return {
        "success": True,
        "total_messages": len(payload.messages),
        "successful_messages": num_successful,
        "aggregate_metrics": {
            "total_resources_generated": total_resources,
            "total_ambiguities_flagged": total_ambiguities,
            "total_phi_redactions": total_redactions,
            "average_confidence_score": avg_confidence,
        },
        "results": results,
    }


class FHIRPushRequest(BaseModel):
    bundle: dict[str, Any] = Field(..., description="FHIR R4 Bundle to transmit")
    fhir_server_url: str = Field(..., description="Target FHIR R4 server endpoint (e.g. https://hapi.fhir.org/baseR4)")
    auth_token: str | None = Field(default=None, description="Optional Bearer token for authorized endpoints")


@router.post("/fhir/push")
async def push_bundle_to_fhir_server(payload: FHIRPushRequest):
    """
    Transmit a mapped FHIR Bundle directly to an external or local FHIR R4 repository.
    Supports HAPI FHIR, Google Cloud Healthcare API, AWS HealthLake, and Smile CDR.
    """
    headers = {
        "Content-Type": "application/fhir+json",
        "Accept": "application/fhir+json",
    }
    if payload.auth_token:
        headers["Authorization"] = f"Bearer {payload.auth_token.strip()}"

    target_url = payload.fhir_server_url.strip().rstrip("/")
    # If the bundle is a transaction/batch bundle, post directly to the base URL
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(target_url, json=payload.bundle, headers=headers)
            return {
                "success": response.is_success,
                "status_code": response.status_code,
                "target_url": target_url,
                "response_body": response.text[:2000],
                "message": f"Server responded with HTTP {response.status_code}",
            }
    except httpx.RequestError as exc:
        return {
            "success": False,
            "status_code": 502,
            "target_url": target_url,
            "error": f"Failed to connect to FHIR server: {str(exc)}",
        }


