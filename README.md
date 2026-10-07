# SemantiCare: AI-Assisted Semantic Data Mapper (HL7 v2 to FHIR R4)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![HL7 FHIR](https://img.shields.io/badge/FHIR-R4_&_US_Core_3.1.1-E06A3B?style=flat-square&logo=fire&logoColor=white)](https://hl7.org/fhir/R4/)

A healthcare developer and clinical informaticist workbench designed to ingest legacy HL7 v2 clinical messages (ADT, ORU, MDM), parse them hierarchically, scrub protected health information (PHI) via a zero-trust reversible token vault, ground clinical terminology to standard LOINC/UCUM ontologies, translate to valid FHIR R4 bundles, surface semantic ambiguities through an interactive Human-in-the-Loop (HITL) resolution deck, and validate conformance against US Core 3.1.1 specifications.

---

## 📚 Complete Documentation Suite

Comprehensive technical, clinical, and operational documentation is available in the [`docs/`](file:///c:/Coding/Healthcare/docs) directory:

| Document | Description |
| :--- | :--- |
| **[System Architecture & Design](file:///c:/Coding/Healthcare/docs/ARCHITECTURE.md)** | Subsystem blueprints, zero-trust token vault, AST parser grammar, and grounded terminology models |
| **[REST API Specification](file:///c:/Coding/Healthcare/docs/API_REFERENCE.md)** | Complete endpoint contracts, request/response models, cURL examples, batch processing, and push gateway |
| **[Clinical Scenarios & Informatics Guide](file:///c:/Coding/Healthcare/docs/CLINICAL_SCENARIOS.md)** | Deep dive into the 5 clinical scenarios (ADT admission, CMP/CBC labs, messy vitals, PACS radiology, cardiology) |
| **[DevOps & Deployment Runbook](file:///c:/Coding/Healthcare/docs/DEPLOYMENT_GUIDE.md)** | Bare-metal, Docker Compose, Render, Vercel, GCP Cloud Run, and AWS HealthLake deployment instructions |

---

## Architecture Overview

```
                      +-----------------------------------+
                      |   Raw HL7 v2 Clinical Message     |
                      |  (ADT^A01, ORU^R01, ADT^A08, etc) |
                      +-----------------+-----------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |  Phase 1: Deterministic Structural Parser   |
                 |  - Header delimiter extraction (| ^ ~ \ &)  |
                 |  - Segments -> Fields -> Repetitions -> Comps|
                 |  - Data type annotations (XPN, CX, CWE, TS)  |
                 +----------------------+----------------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |  Phase 2: Zero-Trust Security & Terminology |
                 |  - Reversible Token Vault (Synthetic IDs)   |
                 |  - LOINC Top-Lab & UCUM Grounding Catalog   |
                 |  - Compound Vitats Decomposer (BP 138/88)   |
                 |  - Proprietary Z-Segment Extension Parser   |
                 +----------------------+----------------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |  Phase 3: Human-in-the-Loop (HITL) Studio   |
                 |  - Missing UCUM unit resolution (kg vs lbs) |
                 |  - Local test code candidate confirmation   |
                 |  - Live in-memory bundle mutation           |
                 |  - Monaco JSON code editor integration      |
                 +----------------------+----------------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |  Phase 4: Validation & Re-Hydration Engine  |
                 |  - US Core 3.1.1 / HL7 Base R4 Validation   |
                 |  - Conformance Scoring & Rule Inspector     |
                 |  - In-Memory PHI Re-Hydration Token Vault   |
                 +----------------------+----------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
+-----------------------------------+       +------------------------------------+
|  Phase 5 & Enterprise Deployment  |       |  Phase 8: Direct FHIR Push Gateway |
|  - Multi-stage Docker container   |       |  - HAPI FHIR / Google Cloud Health |
|  - 5 pre-loaded clinical scenarios|       |  - AWS HealthLake / Azure Health   |
|  - Bulk NDJSON & Transaction JSON |       |  - Bearer token authenticated post |
+-----------------------------------+       +------------------------------------+
```

---

## Key Capabilities Across Phases

### Phase 1: Foundation & Deterministic Structural Parser
* **High-Fidelity HL7 v2 Parser**:
  * Automatic delimiter detection directly from MSH header (`|`, `^`, `~`, `\`, `&`).
  * Resilient normalization of all line-ending formats (`\r\n`, `\r`, `\n`).
  * Recursive AST decomposition: `Segments` $\rightarrow$ `Fields` (1-indexed) $\rightarrow$ `Repetitions` $\rightarrow$ `Components` $\rightarrow$ `Subcomponents`.
  * Comprehensive standard HL7 v2 dictionary metadata annotating standard segments (`MSH`, `EVN`, `PID`, `PV1`, `ORC`, `OBR`, `OBX`, `NTE`, `DG1`, `AL1`, `NK1`, `IN1`) and data types (`XPN`, `CX`, `XAD`, `CWE`, `TS`, `NM`, `ST`).
  * Automatic detection and classification of site-specific proprietary **Z-segments** (e.g., `ZDS`, `ZTR`).

### Phase 2: Zero-Trust Security & Semantic Mapping Engine
* **Reversible Token Vault (Zero-Trust PHI Scrubber)**:
  * Detects and redacts Patient Identifiers, Names, Dates of Birth, Street Addresses, Postal Codes, Phone Numbers, and SSNs before any downstream processing.
  * Generates synthetic surrogate tokens (e.g. `[PATIENT_NAME_1]`, `[MRN_1]`).
  * Ephemeral in-memory Token Vault allows authorized local **re-hydration** with zero external network exposure.
  * Dedicated **PHI Redaction Audit Drawer** detailing all masked elements.
* **Semantic FHIR R4 Bundle Translation**:
  * Constructs FHIR R4 Transaction Bundles across core clinical resources:
    * `Patient` (US Core Patient with identifiers, demographics, race/ethnicity extensions, contacts).
    * `Encounter` (Inpatient, Ambulatory, Emergency with status, class, attending doctor).
    * `Observation` (Laboratory results and vital signs with UCUM units, interpretations, reference ranges).
    * `DiagnosticReport` (Lab batteries, radiology studies with impressions and physician signatures).
    * `Condition` (ICD-10-CM mapped active diagnoses with US Core encounter-diagnosis category).
    * `Coverage` (Commercial and government payers with policy and subscriber identifiers).
  * Decomposes compound clinical measurements (e.g. `138/88` blood pressure into systolic & diastolic components).
  * Maps proprietary hospital Z-segments (`ZDS` DICOM study and `ZTR` patient transport) into structured FHIR extensions.
* **Local LOINC & UCUM Terminology Grounding**:
  * Deterministic catalog grounding prevents LLM hallucination of clinical codes.
  * Fuzzy token matcher for non-standard local terms (e.g., `BP_LOCAL` $\rightarrow$ LOINC `85354-9`).
  * Dynamic candidate inference for missing UCUM units.

### Phase 3: Human-in-the-Loop (HITL) Resolution Deck
* **Interactive HITL Resolution Deck**:
  * Dedicated studio perspective surfacing all unresolved clinical flags.
  * **Missing UCUM Unit Cards**: Interactive selection between recommended metric (`kg`) or US customary (`[lb_av]`) units, or custom unit entry $\rightarrow$ mutates the FHIR observation in memory.
  * **Local Code Confirmation Cards**: Choose between ranked LOINC candidates or confirm groundings.
  * **Compound Reading & Z-Segment Verification**: Informaticist verification stamp for decomposed vitals and custom hospital extensions.
  * Dynamic overall confidence recalculation upon resolution (boosts confidence to 100%).
* **Visual Confidence Badges**:
  * Green: High ($\ge 90\%$) deterministic/verified.
  * Yellow: Needs Review ($70-89\%$) inferred terminology or Z-segment.
  * Red: Action Required ($<70\%$) missing units or ungrounded data.
* **Monaco Editor Integration**:
  * Direct in-browser Monaco JSON editor with syntax highlighting (`vs-dark`).
  * Prettify JSON, reset to AI baseline, copy JSON, and download bundle.

### Phase 4: FHIR R4 Validation & Dual-Mode Export
* **Conformance & Schema Validator**:
  * Real-time validation against official HL7 FHIR R4 schemas and US Core 3.1.1 profiles.
  * Referential integrity validation (verifies subject/encounter references match declared bundle resources).
  * Visual Issue Inspector with severity badges (Error, Warning, Info), specific JSON paths, and rule explanations.
  * Quantitative Conformance Score meter (0 - 100%).
* **Dual-Flavor Export**:
  * **De-Identified Flavor**: Safe for public AI research, data science, and benchmark evaluations.
  * **Re-Hydrated Flavor**: Locally restored patient demographics from Token Vault for hospital integration.
  * Formats: Standard JSON Transaction Bundle or Bulk FHIR NDJSON (newline-delimited JSON).

### Phase 5 & Enterprise Features: Production Deployment & FHIR Push
* **5 Pre-Loaded Curated Clinical Scenarios**:
  1. `ADT^A01` - Inpatient Hospital Admission (complete demographics, attending MD, next of kin, commercial insurance).
  2. `ORU^R01` - Comprehensive Metabolic & CBC Lab Results (coded LOINC battery, numeric values, abnormal flags `H`/`L`, reference ranges).
  3. `ORU^R01` - Vital Signs with Ambiguities (missing UCUM units on body weight, compound blood pressure, Fahrenheit temperature).
  4. `ORU^R01` - Radiology Order with Proprietary Z-Segments (`ZDS` DICOM study, `ZTR` patient transport).
  5. `ADT^A08` - Cardiology Visit with Dual Diagnoses & Commercial Insurance (ICD-10 CAD & Hypertension, emergency contact, Aetna coverage).
* **Direct FHIR Repository Push**:
  * One-click HTTP POST to live FHIR repositories (HAPI FHIR, Google Cloud Healthcare API, AWS HealthLake, Azure Health Data Services).
  * Configurable endpoint URL and Bearer token authentication with live transaction response feedback.
* **Batch Multi-Message Mapping API**:
  * `/api/batch/map` endpoint to process message streams and return aggregate pipeline metrics.
* **Containerization**:
  * Multi-stage `Dockerfile` for Python backend with non-root security user.
  * Multi-stage `Dockerfile` for frontend with Nginx reverse proxy.
  * Single-command orchestration via `docker-compose.yml`.

### Version 1.1: Institutional Mapping Memory & Clinical NLP
* **Persistent Mapping Memory & Rulebase**:
  * **SQLite ACID Persistence**: Saves clinical informaticist unit defaults, local terminology groundings, and Z-segment translations (`backend/app/data/mapping_rules.db`).
  * **Facility-Aware Context**: Matches rules against sending facility (`MSH-4`) and receiving facility (`MSH-6`) with global wildcard (`*`) fallback.
  * **Automated Ambiguity Resolution**: Incoming messages matching established rules automatically resolve ambiguities with high confidence (100%), tagging resolutions with `is_resolved=True` and institutional attribution.
  * **Interactive Rule Management UI**: Dedicated modal to inspect, search, filter by facility/type, create new rules, and delete obsolete entries.
  * **1-Click HITL Rule Learning**: "Remember this rule in Mapping Memory" checkbox directly in the Resolution Deck to capture informaticist decisions immediately.
  * **FHIR ConceptMap Export**: Generates standard HL7 FHIR `ConceptMap` JSON resources for interoperability across hospital IT systems.
* **NTE Unstructured Note Clinical Entity Extraction (Clinical NLP)**:
  * **Narrative Note Parsing**: Automatically extracts actionable clinical entities from unstructured physician and pathologist `NTE` comments.
  * **Condition Extraction**: Maps provisional diagnoses and findings (e.g. pneumonia, atelectasis, pleural effusion, hyperglycemia) to FHIR `Condition` resources with ICD-10-CM coding.
  * **AllergyIntolerance Extraction**: Identifies drug allergies (e.g. Penicillin, Sulfa, Aspirin, Latex) with RxNorm / SNOMED CT terminology.
  * **ServiceRequest Extraction**: Converts physician care plan follow-up recommendations (e.g. HbA1c screening, echocardiogram consult) into FHIR `ServiceRequest` proposals.
  * **End-to-End Lineage & Provenance**: Extracted entities are tagged with `nte-extracted` security metadata and linked to patient/encounter surrogate URNs.

---

## Quickstart

### Prerequisites
* Python 3.12+ (or 3.14)
* Node.js 18+ & npm
* Docker & Docker Compose (Optional, for containerized run)

### Running with Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/markdmitchell/semanticare.git
cd semanticare

# Build and start both backend and frontend
docker compose up --build
```

The application will be live at:
* **Frontend Web Studio**: `http://localhost:3000`
* **FastAPI Backend & Swagger**: `http://localhost:8000/docs`

---

### Running Locally (Bare Metal)

#### 1. Start the Backend API:
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Start the Frontend Studio:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, active phases `[1, 2, 3, 4, 5]`, and feature flags |
| `GET` | `/api/samples` | List of 5 curated clinical scenarios |
| `POST` | `/api/parse` | Structural AST parser returning segments, fields, components |
| `POST` | `/api/map` | Semantic mapping engine with PHI scrubbing and HITL flags |
| `POST` | `/api/validate` | FHIR R4 and US Core 3.1.1 conformance validator |
| `POST` | `/api/terminology/lookup` | Fuzzy token search against LOINC/UCUM catalog |
| `POST` | `/api/batch/map` | Batch processor for array of HL7 v2 messages |
| `POST` | `/api/fhir/push` | Gateway to transmit FHIR bundle to external FHIR server |

---

## Testing & Quality Assurance

Run the automated test suites:

```bash
cd backend

# Structural Parser Unit Tests
.venv\Scripts\python.exe test_parser.py

# Semantic Mapper & Token Vault Tests
.venv\Scripts\python.exe test_mapper.py

# FHIR Validator & US Core Conformance Tests
.venv\Scripts\python.exe test_validator.py

# End-to-End Clinical Pipeline Tests
.venv\Scripts\python.exe test_e2e_pipeline.py
```

---

## License & Compliance Note
This software is intended for healthcare software development, integration engineering, and clinical informatics research. All included clinical scenarios use synthetic, de-identified patient data compliant with the HIPAA Safe Harbor standard.
