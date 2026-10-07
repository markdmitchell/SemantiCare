# REST API Specification & Reference

The SemantiCare backend exposes a comprehensive RESTful API built on **FastAPI** with auto-generated OpenAPI 3.1.0 specifications.

* **Base URL**: `http://localhost:8000/api` (or `/api` via Vite/Nginx reverse proxy)
* **Interactive Swagger UI**: `http://localhost:8000/docs`
* **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## Endpoint Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status, active phases, and capability flags |
| `GET` | `/samples` | Retrieve all 5 curated clinical HL7 sample messages |
| `GET` | `/samples/{sample_id}` | Retrieve a specific sample message by ID |
| `POST` | `/parse` | Deterministic structural HL7 v2 AST parsing |
| `POST` | `/map` | Semantic FHIR R4 translation with PHI scrubbing & HITL flags |
| `POST` | `/validate` | FHIR R4 schema and US Core 3.1.1 conformance validation |
| `POST` | `/terminology/lookup` | Fuzzy token search against the grounded LOINC/UCUM catalog |
| `POST` | `/batch/map` | Enterprise batch processor for arrays of HL7 v2 messages |
| `POST` | `/fhir/push` | Gateway to transmit FHIR transaction bundle to external server |

---

## 1. System & Scenario Endpoints

### 1.1. Health Check
`GET /api/health`

Verifies backend service operational status, currently active phases, and supported capability flags.

#### Response (`200 OK`)
```json
{
  "status": "online",
  "service": "AI-Assisted HL7 v2 to FHIR R4 Mapper API",
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
    "Docker Multi-Stage Containerization Architecture"
  ]
}
```

#### cURL Example
```bash
curl -X GET "http://localhost:8000/api/health"
```

---

### 1.2. List Clinical Scenarios
`GET /api/samples`

Returns the library of five curated clinical scenarios across inpatient admission, laboratory telemetry, ambiguous vitals, custom Z-segments, and outpatient specialty care.

#### Response (`200 OK`)
```json
{
  "count": 5,
  "samples": [
    {
      "id": "adt-a01-admission",
      "title": "ADT^A01 - Inpatient Hospital Admission",
      "category": "Demographics & Encounter",
      "description": "Standard adult admission containing Patient Demographics (PID), Next of Kin (NK1), Inpatient Visit (PV1), Admitting Diagnosis (DG1), and Insurance (IN1).",
      "highlights": [
        "Structured Patient Name (Family^Given^Middle)",
        "Attending Physician (NPI / Provider ID)",
        "Inpatient Room & Bed Assignment",
        "Emergency Contact Relationship"
      ],
      "raw": "MSH|^~\\&|EPIC_EHR|METRO_HEALTH|..."
    }
  ]
}
```

#### cURL Example
```bash
curl -X GET "http://localhost:8000/api/samples"
```

---

## 2. Ingestion & Transformation Endpoints

### 2.1. Structural HL7 Parser
`POST /api/parse`

Performs deterministic lexical analysis, extracts MSH delimiters, normalizes line endings, and returns a recursive Abstract Syntax Tree (AST) down to components and subcomponents.

#### Request Body
```json
{
  "raw_hl7": "MSH|^~\\&|EPIC_EHR|METRO_HEALTH|INTEGRATION_HUB|CENTRAL_HOSP|20261006143000||ADT^A01^ADT_A01|MSG001|P|2.5.1\rPID|1||MRN987654321^^^METRO^MR||EVERGREEN^ELEANOR||19840512|F"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "is_valid": true,
  "metadata": {
    "message_type": "ADT^A01^ADT_A01",
    "trigger_event": "A01",
    "sending_app": "EPIC_EHR",
    "sending_facility": "METRO_HEALTH",
    "hl7_version": "2.5.1",
    "delimiters": {
      "field": "|",
      "component": "^",
      "repetition": "~",
      "escape": "\\",
      "subcomponent": "&"
    },
    "total_segments": 2
  },
  "segments": [
    {
      "segment_index": 1,
      "segment_name": "MSH",
      "definition": "Message Header",
      "is_custom_z": false,
      "fields": [
        {
          "field_index": 1,
          "name": "Field Separator",
          "raw_value": "|",
          "repetitions": []
        }
      ]
    }
  ],
  "error": null
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/parse" \
     -H "Content-Type: application/json" \
     -d '{"raw_hl7": "MSH|^~\\&|EPIC|HOSP|||20261006||ADT^A01|001|P|2.5\rPID|1||MRN123||DOE^JOHN||19800101|M"}'
```

---

### 2.2. Semantic FHIR R4 Mapper
`POST /api/map`

Executes the semantic mapping pipeline:
1. De-identifies PHI into synthetic tokens (`[PATIENT_NAME_1]`, `[MRN_1]`).
2. Extracts hierarchical AST.
3. Translates into a FHIR R4 Transaction Bundle (`Patient`, `Encounter`, `Observation`, `DiagnosticReport`, `Condition`, `Coverage`).
4. Grounds laboratory codes and vital signs against the LOINC/UCUM catalog.
5. Emits clinical ambiguity flags for Human-in-the-Loop review.
6. Generates both de-identified and re-hydrated bundles.

#### Request Body
```json
{
  "raw_hl7": "MSH|^~\\&|COBAS|LAB|EPIC|HOSP|20261006||ORU^R01|001|P|2.5\rPID|1||MRN123||DOE^JOHN||19800101|M\rOBR|1|||24323-8^CMP^LN|||20261006\rOBX|1|NM|2345-7^Glucose^LN||165|mg/dL|70-99|H|||F",
  "enable_phi_scrubbing": true
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "fhir_bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "id": "bundle-a1b2c3d4",
    "entry": [
      {
        "fullUrl": "urn:uuid:pat-1001",
        "resource": {
          "resourceType": "Patient",
          "id": "pat-1001",
          "name": [
            {
              "use": "official",
              "family": "[PATIENT_FAMILY_NAME_1]",
              "given": ["[PATIENT_GIVEN_NAME_1]"]
            }
          ]
        },
        "request": {
          "method": "POST",
          "url": "Patient"
        }
      }
    ]
  },
  "rehydrated_bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "name": [
            {
              "family": "DOE",
              "given": ["JOHN"]
            }
          ]
        }
      }
    ]
  },
  "phi_audit": {
    "total_redactions": 3,
    "entity_breakdown": {
      "PATIENT_MRN": 1,
      "PATIENT_FAMILY_NAME": 1,
      "PATIENT_GIVEN_NAME": 1
    }
  },
  "confidence_score": 100,
  "confidence_counts": {
    "high": 6,
    "medium": 0,
    "low": 0
  },
  "ambiguities": [],
  "total_resources": 4,
  "resource_types": ["Patient", "Observation", "DiagnosticReport"]
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/map" \
     -H "Content-Type: application/json" \
     -d '{"raw_hl7": "MSH|^~\\&|COBAS|LAB|||20261006||ORU^R01|01|P|2.5\rPID|1||MRN99||SMITH^JANE||19900101|F\rOBR|1|||24323-8^CMP^LN\rOBX|1|NM|2345-7^Glucose^LN||110|mg/dL|70-99|H|||F", "enable_phi_scrubbing": true}'
```

---

## 3. Conformance & Terminology Endpoints

### 3.1. FHIR Bundle Validator
`POST /api/validate`

Validates any FHIR R4 Bundle against base specifications and the US Core 3.1.1 profile. Performs structural validation, checks required elements, inspects UCUM units, and verifies referential integrity.

#### Request Body
```json
{
  "bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      {
        "fullUrl": "urn:uuid:pat-1",
        "resource": {
          "resourceType": "Patient",
          "id": "pat-1"
        }
      }
    ]
  },
  "profile": "us-core-3.1.1"
}
```

#### Response (`200 OK`)
```json
{
  "is_valid": true,
  "conformance_score": 97,
  "total_resources_checked": 1,
  "valid_resources_count": 1,
  "profile_used": "us-core-3.1.1",
  "error_count": 0,
  "warning_count": 1,
  "info_count": 0,
  "issues_summary": {
    "errors": 0,
    "warnings": 1,
    "information": 0
  },
  "issues": [
    {
      "severity": "warning",
      "resource_id": "pat-1",
      "resource_type": "Patient",
      "location": "Patient.extension[us-core-ethnicity]",
      "rule": "US Core Patient",
      "message": "US Core Patient recommends OMB Ethnicity category extension."
    }
  ]
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/validate" \
     -H "Content-Type: application/json" \
     -d '{"bundle": {"resourceType": "Bundle", "type": "transaction", "entry": []}, "profile": "us-core-3.1.1"}'
```

---

### 3.2. Terminology Fuzzy Lookup
`POST /api/terminology/lookup`

Searches the local clinical catalog for matching LOINC test codes and UCUM units based on token overlap and synonyms.

#### Request Body
```json
{
  "query": "potassium"
}
```

#### Response (`200 OK`)
```json
{
  "query": "potassium",
  "exact_match": null,
  "candidates": [
    {
      "code": "2823-3",
      "display": "Potassium [Moles/volume] in Serum or Plasma",
      "system": "http://loinc.org",
      "preferred_unit": "mmol/L",
      "confidence": 0.95,
      "reason": "Exact synonym match: 'potassium'"
    }
  ]
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/terminology/lookup" \
     -H "Content-Type: application/json" \
     -d '{"query": "fasting glucose"}'
```

---

## 4. Enterprise & Ingestion Endpoints

### 4.1. Batch Multi-Message Processor
`POST /api/batch/map`

Processes an array of raw HL7 v2 messages concurrently. Emits individual mapped bundles alongside aggregated pipeline metrics.

#### Request Body
```json
{
  "messages": [
    "MSH|^~\\&|EPIC|HOSP|||20261006||ADT^A01|001|P|2.5\rPID|1||MRN1||SMITH^BOB||19750101|M",
    "MSH|^~\\&|COBAS|LAB|||20261006||ORU^R01|002|P|2.5\rPID|1||MRN2||JONES^ALICE||19850202|F\rOBR|1|||24323-8^CMP^LN\rOBX|1|NM|2345-7^Glucose^LN||95|mg/dL|70-99|N|||F"
  ],
  "enable_phi_scrubbing": true
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "total_messages": 2,
  "successful_messages": 2,
  "aggregate_metrics": {
    "total_resources_generated": 6,
    "total_ambiguities_flagged": 0,
    "total_phi_redactions": 6,
    "average_confidence_score": 100
  },
  "results": [
    {
      "message_index": 0,
      "success": true,
      "bundle_id": "bundle-111",
      "total_resources": 2,
      "confidence_score": 100,
      "ambiguities_count": 0,
      "fhir_bundle": { "resourceType": "Bundle", ... }
    }
  ]
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/batch/map" \
     -H "Content-Type: application/json" \
     -d '{"messages": ["MSH|^~\\&|EPIC|HOSP|||20261006||ADT^A01|001|P|2.5\rPID|1||MRN1||DOE^JOHN||19800101|M"], "enable_phi_scrubbing": true}'
```

---

### 4.2. Direct FHIR Server Push Gateway
`POST /api/fhir/push`

Transmits a mapped FHIR Bundle directly to an external FHIR R4 repository (e.g. HAPI FHIR, Google Cloud Healthcare API, AWS HealthLake, Azure Health Data Services) via an authenticated HTTP POST with `Content-Type: application/fhir+json`.

#### Request Body
```json
{
  "bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [ ... ]
  },
  "fhir_server_url": "https://hapi.fhir.org/baseR4",
  "auth_token": "optional-bearer-token-here"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "status_code": 200,
  "target_url": "https://hapi.fhir.org/baseR4",
  "response_body": "{\"resourceType\":\"Bundle\",\"type\":\"transaction-response\",...}",
  "message": "Server responded with HTTP 200"
}
```

#### Error Response (`502 Bad Gateway`)
```json
{
  "success": false,
  "status_code": 502,
  "target_url": "https://invalid-fhir-endpoint.org",
  "error": "Failed to connect to FHIR server: [Errno 11001] getaddrinfo failed"
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/fhir/push" \
     -H "Content-Type: application/json" \
     -d '{
       "bundle": {"resourceType": "Bundle", "type": "transaction", "entry": []},
       "fhir_server_url": "https://hapi.fhir.org/baseR4"
     }'
```

---

## 5. Institutional Mapping Memory & Rulebase Endpoints (v1.1)

### 5.1. List Mapping Rules
`GET /api/rules`

Retrieves all institutional mapping rules from SQLite, optionally filtered by sending facility.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `facility` | string | No | Filter by facility code (e.g. `METRO_HEALTH`). Rules with global facility `*` are always included. |

#### Response (`200 OK`)
```json
{
  "count": 3,
  "facility_filter": "METRO_HEALTH",
  "rules": [
    {
      "id": "rule-f7db293e",
      "facility": "METRO_HEALTH",
      "rule_type": "LOCAL_TERMINOLOGY",
      "source_key": "BP_LOCAL",
      "target_value": "85354-9",
      "target_display": "Blood pressure panel with all children optional",
      "author": "Clinical Informatics Governance",
      "created_at": "2026-10-06T20:00:00Z",
      "applied_count": 5,
      "notes": "Philips bedside telemetry default"
    }
  ]
}
```

---

### 5.2. Create or Update Mapping Rule
`POST /api/rules`

Persists an institutional mapping rule into the SQLite repository. If a rule with the same `(facility, rule_type, source_key)` exists, it updates the existing entry.

#### Request Body
```json
{
  "facility": "METRO_HEALTH",
  "rule_type": "MISSING_UNIT",
  "source_key": "29463-7",
  "target_value": "kg",
  "target_display": "Kilograms (kg)",
  "author": "Dr. Sarah Chen, Informatics Lead",
  "notes": "Inpatient smart-scale calibration standard"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "rule": {
    "id": "rule-64ebf331",
    "facility": "METRO_HEALTH",
    "rule_type": "MISSING_UNIT",
    "source_key": "29463-7",
    "target_value": "kg",
    "target_display": "Kilograms (kg)",
    "author": "Dr. Sarah Chen, Informatics Lead",
    "created_at": "2026-10-06T20:15:00Z",
    "applied_count": 0,
    "notes": "Inpatient smart-scale calibration standard"
  },
  "message": "Rule 'rule-64ebf331' saved successfully for facility 'METRO_HEALTH'."
}
```

---

### 5.3. Delete Mapping Rule
`DELETE /api/rules/{rule_id}`

Deletes an institutional rule by unique identifier.

#### Response (`200 OK`)
```json
{
  "success": true,
  "deleted_id": "rule-64ebf331",
  "message": "Rule 'rule-64ebf331' deleted successfully."
}
```

---

### 5.4. Export FHIR ConceptMap
`GET /api/rules/export`

Exports all persistent institutional terminology rules as an HL7 FHIR R4 `ConceptMap` resource JSON suitable for hospital integration.

#### Response (`200 OK`)
```json
{
  "resourceType": "ConceptMap",
  "id": "semanticare-institutional-rules",
  "title": "SemantiCare Institutional Terminology ConceptMap",
  "status": "active",
  "date": "2026-10-06",
  "publisher": "SemantiCare Clinical Informatics",
  "sourceUri": "http://example.org/fhir/ValueSet/local-hospital-codes",
  "targetUri": "http://loinc.org/vs",
  "group": [
    {
      "source": "http://example.org/codes/hospital-local",
      "target": "http://loinc.org",
      "element": [
        {
          "code": "BP_LOCAL",
          "target": [
            {
              "code": "85354-9",
              "display": "Blood pressure panel with all children optional",
              "equivalence": "equivalent",
              "comment": "Institutional rule for facility: METRO_HEALTH. Author: Clinical Informatics Governance"
            }
          ]
        }
      ]
    }
  ]
}
```

