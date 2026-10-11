# Changelog

All notable changes to the SemantiCare platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-10-11

### Added
- **Prominent Reset Workspace Button**:
  - Added a dedicated, 1-click `Reset Workspace` button to the primary navigation bar directly adjacent to the workspace selector.
  - Features real-time state detection: highlights as a crisp white card with a subtle shadow and rose hover state when content is active, and dims with an accessible disabled state when the workspace is already clean.
  - Performs complete, synchronized reset of raw HL7 payload, active scenario metadata, AST segment tree, FHIR transaction bundles, patient demographics banner, and US Core conformance scores.
  - Synchronized the Clinical Message editor panel trash action to execute full workspace clearing in tandem.
- **Interactive Guided Clinical Walkthrough & Demo Tour**:
  - Built an interactive 5-step guided clinical tour (`GuidedTour.tsx`) highlighting the platform workflow from ingestion to bulk export.
  - Step 1: Feed Ingestion, Delimiter Parsing, and Structural Linting.
  - Step 2: EHR Patient Banner and Zero-Trust Reversible Token Vault.
  - Step 3: Human-in-the-Loop (HITL) Ambiguity Resolution and Institutional Memory.
  - Step 4: Semantic FHIR R4 Bundle Studio, Token Diff, and Provenance Tree.
  - Step 5: US Core 3.1.1 Conformance Inspector, NDJSON, and FHIR Store Gateway.
  - Integrated 10-second auto-play timer with pause/resume controls and preset selection (Golden Walkthrough, Cardiology Admission, Critical Panic Labs, HITL Ambiguity Showcase).
- **Dynamic State Synchronization Across Tour Steps**:
  - Implemented centralized `goToStep` controller ensuring workbench state synchronizes cleanly across all forward and backward step transitions.
  - Stepping back to Step 1 automatically restores the clean, blank workspace initial state.
  - Stepping to Step 2 guarantees active zero-trust PHI token vault protection.
  - Stepping to Step 3 dynamically restores clinical ambiguities back to their unreviewed baseline state so informaticist review can be demonstrated repeatedly.
  - Steps 4 and 5 automatically ensure clinical case ingestion and align active workbench perspectives.
- **Blank Workspace First-Run Experience**:
  - Configured SemantiCare to start from a clean, blank workspace on initial launch.
  - Designed an interactive Quick-Start card in `HL7InputPanel` with 1-click actions: Launch Guided Demo, Load Sample Admission, or paste from clipboard.

### Changed
- **Navigation & Workspace Selector Semantics**:
  - Replaced ambiguous "Load Scenario" dropdown placeholder with clear "Load Workspace" terminology.
  - Renamed blank canvas option to `📄 Blank Workspace (Custom HL7)` to distinguish freeform HL7 v2 authoring from curated hospital presets.
  - Consolidated navigation layout into a single desktop header with native scenario selector and overflow tools dropdown, adhering to project usability rules.
- **Two-Row Responsive Footer**:
  - Restructured footer into two distinct horizontal rows separating brand identity and engine status from navigation links, terms, and modal dialog triggers.

---

## [1.2.0] - 2026-10-10

### Added
- **HL7 v2 Structural Linter & Conformance Inspector**:
  - Delimiter audit, MSH mandatory field checker, PID demographics validation, and OBX result metrics linting.
  - Real-time Conformance Score (0-100%) and expandable diagnostic drawer with clinical recommendations.
- **Enterprise Multi-Message Batch Processing Studio**:
  - Batch translation studio supporting clinical cohort runs and custom multi-message log uploads.
  - Real-time aggregate telemetry: message throughput, total resources generated, average confidence, and vaulted PHI counts.
  - Bulk FHIR NDJSON (`.ndjson`) and consolidated JSON (`.json`) streaming download.
- **Clinical Topology & Resource Provenance Graph**:
  - Interactive DAG visualization mapping `Patient` -> `Encounter` -> `DiagnosticReport` -> `Observations` / `Conditions` / `ServiceRequests` / `Coverage`.
  - Contextual status badges, abnormal flag highlights, and 1-click single-resource JSON copy.
- **Intelligent Hybrid Dual-Engine Architecture**:
  - Automatic FastAPI backend detection (`http://127.0.0.1:8000/api`) with zero-dependency in-browser TypeScript failover.
  - Real-time telemetry console displaying active mode, ping latency, capability checklist, and engine preference switching (`auto`, `backend`, `browser`).

---

## [1.1.0] - 2026-10-08

### Added
- **Institutional Mapping Memory (v1.1)**:
  - Persistent rule engine allowing clinical informaticists to commit ambiguity resolutions to institutional memory.
  - Facility-scoped indexing (`MSH-4`) with automated auto-resolution of recurring missing units and local hospital codes on future feeds.
  - ConceptMap import and export functionality compliant with FHIR R4 `ConceptMap` resource specifications.
- **Clinical NLP Entity Extraction (`NTE` NER)**:
  - High-precision regex and clinical NLP entity extraction from unstructured physician and pathology narrative notes in `NTE` segments.
  - Automatic extraction of active conditions, suspected diagnoses, allergy intolerances, and follow-up care service requests.
- **On-The-Fly Synthetic Case Generator**:
  - Procedural HL7 v2 message synthesizer producing randomized, realistic ADT and ORU clinical test cases on demand.

---

## [1.0.0] - 2026-10-06

### Added
- **Deterministic HL7 v2 AST Parser**:
  - Header delimiter extraction (`|`, `^`, `~`, `\`, `&`) with resilient multi-line break handling (`CR`, `LF`, `CRLF`).
  - Hierarchical decomposition into Segments, Fields, Repetitions, Components, and Subcomponents with standard HL7 dictionary annotations.
- **Zero-Trust PHI Scrubber & Reversible Token Vault**:
  - Ephemeral in-memory de-identification redacting patient names, MRNs, DOBs, addresses, phone numbers, and SSNs into cryptographic surrogate tokens.
  - 1-click reversible rehydration for authorized local review without network leakage.
- **Semantic FHIR R4 Translation Engine**:
  - Full mapping of `ADT^A01`, `ADT^A08`, and `ORU^R01` messages into FHIR R4 Transaction Bundles (`Patient`, `Encounter`, `Observation`, `Condition`, `ServiceRequest`, `Coverage`).
  - Compound vitals decomposition (blood pressure `138/88` into systolic and diastolic components).
  - Proprietary hospital Z-segment parsing (`ZDS`, `ZTR`).
- **Human-in-the-Loop (HITL) Resolution Deck**:
  - Visual review cards for flagged clinical ambiguities (missing units, local test codes) with confidence scoring.
- **US Core 3.1.1 Conformance Validator**:
  - Conformance scoring meter and rule-by-rule inspector verifying bundles against US Core profiles and HL7 Base R4 schemas.
- **Dual Engine Architecture**:
  - Dual-mode execution supporting both local FastAPI backend and standalone in-browser TypeScript engine.
- **Export & Push Gateway**:
  - Transaction JSON, bulk FHIR NDJSON, and authenticated direct transmission to external FHIR repositories.
