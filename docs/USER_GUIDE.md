# SemantiCare User Guide
## AI-Assisted Semantic Data Mapper • HL7 v2 to FHIR R4

Welcome to the **SemantiCare User Guide**. SemantiCare is an enterprise-grade clinical data mapping and semantic translation platform designed for healthcare developers, clinical informaticists, interface analysts, and EHR integration teams. It bridges legacy health systems using HL7 v2 (v2.3, v2.4, v2.5, v2.5.1) and modern FHIR R4 interoperability standards.

This guide walks you through every feature of the SemantiCare workbench, from ingesting raw clinical feeds and configuring zero-trust de-identification, to resolving semantic ambiguities, managing institutional rule memory, validating conformance against US Core 3.1.1, and transmitting bundles to production FHIR servers.

---

## Table of Contents
1. [Platform Overview & Key Concepts](#1-platform-overview--key-concepts)
2. [User Interface Tour](#2-user-interface-tour)
3. [Step-by-Step Workflow](#3-step-by-step-workflow)
   - [Step 1: Selecting or Entering an HL7 v2 Message](#step-1-selecting-or-entering-an-hl7-v2-message)
   - [Step 2: Zero-Trust PHI De-Identification & Re-Hydration](#step-2-zero-trust-phi-de-identification--re-hydration)
   - [Step 3: Exploring the Structural AST Perspective](#step-3-exploring-the-structural-ast-perspective)
   - [Step 4: Semantic Mapping to FHIR R4 Resources](#step-4-semantic-mapping-to-fhir-r4-resources)
   - [Step 5: Clinical NLP Entity Extraction from NTE Comments](#step-5-clinical-nlp-entity-extraction-from-nte-comments)
   - [Step 6: Human-in-the-Loop (HITL) Resolution Deck](#step-6-human-in-the-loop-hitl-resolution-deck)
   - [Step 7: Institutional Mapping Memory & Rulebase Management](#step-7-institutional-mapping-memory--rulebase-management)
   - [Step 8: FHIR R4 & US Core Conformance Validation](#step-8-fhir-r4--us-core-conformance-validation)
   - [Step 9: In-Browser Monaco JSON Editing & Live Mutation](#step-9-in-browser-monaco-json-editing--live-mutation)
   - [Step 10: Exporting Bundles & Transmitting to FHIR Stores](#step-10-exporting-bundles--transmitting-to-fhir-stores)
   - [Step 11: Interactive Guided Clinical Demo & Walkthrough](#step-11-interactive-guided-clinical-demo--walkthrough)
4. [Curated Clinical Scenarios Guide](#4-curated-clinical-scenarios-guide)
5. [Institutional Knowledge Base & ConceptMap Interoperability](#5-institutional-knowledge-base--conceptmap-interoperability)
6. [Best Practices & Informaticist Tips](#6-best-practices--informaticist-tips)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Platform Overview & Key Concepts

SemantiCare automates the translation of legacy HL7 v2 feeds into standard FHIR R4 transaction bundles, with zero reliance on cloud-only black boxes or hallucination-prone generic LLMs.

### Key Concepts

| Concept | Description |
| :--- | :--- |
| **Deterministic Parsing** | The message structure is broken down into an Abstract Syntax Tree (AST) using exact header delimiters (`\|`, `^`, `~`, `\`, `&`) down to segment, field, repetition, and component levels. |
| **Zero-Trust PHI Token Vault** | Patient names, MRNs, dates of birth, street addresses, phone numbers, and SSNs are replaced in-memory with deterministic cryptographic surrogate tokens (e.g. `[PATIENT_GIVEN_NAME_1]`) before semantic processing. |
| **Ontology Grounding** | Local hospital test codes and analyte names are grounded against deterministic LOINC catalogs (Top-Lab 2000) and Unified Code for Units of Measure (UCUM). |
| **Clinical NLP (`NTE` NER)** | Narrative physician and pathologist notes in `NTE` segments are processed by high-precision clinical extractors to yield structured FHIR `Condition`, `AllergyIntolerance`, and `ServiceRequest` resources. |
| **Human-in-the-Loop (HITL)** | When a message contains semantic ambiguities (missing units of measure, ungrounded proprietary codes, compound blood pressure values), SemantiCare surfaces visual cards for informaticist review. |
| **Institutional Mapping Memory** | When an informaticist resolves an ambiguity, the resolution can be committed to a persistent SQLite rulebase indexed by sending facility (`MSH-4`). Future incoming messages from that hospital auto-resolve with 100% confidence. |
| **US Core Validation** | Generated bundles are evaluated against US Core 3.1.1 Implementation Guides and base HL7 FHIR R4 schema rules with sub-second response times. |

---

## 2. User Interface Tour

The SemantiCare application interface is organized into cohesive functional regions designed for high-throughput informaticist productivity:

```
+-----------------------------------------------------------------------------------+
| [Logo] SemantiCare  [Structure] [Review (N)] [FHIR R4] [Validation (Score%)]      | <-- Top Navbar
|                     [Guided Demo] [Load workspace...] [Reset Workspace] [...] [Export]|
+-----------------------------------------------------------------------------------+
| [Patient Demographics Banner: Demographics, MRN, Encounter, PHI Status, Metrics]  | <-- Patient Banner
+------------------------------------------+----------------------------------------+
|                                          |                                        |
|  LEFT PANE: INGESTION & CONTROLS         |  RIGHT PANE: ACTIVE PERSPECTIVE        |
|                                          |                                        |
|  * Message Editor (with Seg / Line Count)|  Perspective 1: Structure (AST Tree)   |
|  * Conformance Diagnostics Drawer Trigger|  Perspective 2: Review (HITL Deck)     |
|  * Quick-Start Card (When Workspace Blank|  Perspective 3: FHIR R4 Bundle Studio  |
|  * Segment Topology Ribbon               |  Perspective 4: US Core Conformance    |
|  * Reversible PHI Protection Toggle      |                                        |
|  * [Reset Workspace / Trash] & [Format]  |                                        |
|                                          |                                        |
+------------------------------------------+----------------------------------------+
| Bottom Footer: (Row 1) Brand, Engine Status | (Row 2) Docs, Privacy, Terms, GitHub |
+-----------------------------------------------------------------------------------+
```

### 1. Top Navbar
- **Brand & Engine Indicator**: Displays SemantiCare brand identity and active engine status (FastAPI Backend / In-Browser Web Engine).
- **Perspective Tabs**: Switch between **Structure** (AST tree), **Review** (HITL ambiguity deck), **FHIR R4** (bundle studio), and **Validation** (US Core inspector).
- **Unresolved Ambiguities Counter**: Amber badge displaying pending clinical ambiguities requiring human decision.
- **Conformance Score Meter**: Real-time percentage indicator of FHIR R4 and US Core compliance.
- **Guided Demo Button**: Launches the 5-step interactive clinical tour with auto-advance and scenario preset switching.
- **Load Workspace Selector**: Native selector offering immediate access to the **Blank Workspace (Custom HL7)**, curated hospital scenarios, or random synthetic case generation.
- **Reset Workspace Button**: Dedicated 1-click button adjacent to the workspace selector that wipes the active case, clears patient demographics, and restores the blank workspace.
- **More Tools (`...`)**: Compact overflow menu providing access to Batch Studio, Institutional Memory, Engine Status, Roadmap, and Documentation.
- **Export Trigger**: Launches the dual-flavor export studio (De-Identified vs. Re-Hydrated FHIR bundles).

### 2. Clinical Patient Demographics Banner
- Renders when a parsed message is loaded in the workspace.
- Displays patient name, sex, DOB, calculated age, MRN, hospital encounter classification, attending physician, and security guardrail badges.

### 3. Left Ingestion Panel
- Multi-line editor for entering, pasting, or modifying HL7 v2 payloads.
- **Blank Workspace Quick-Start Card**: Rendered when the workspace is empty, offering 1-click shortcuts to launch the guided demo, load sample admissions, or paste from clipboard.
- Live Segment Topology Ribbon tracking segment sequences (`MSH -> PID -> PV1 -> OBX`).
- Reversible zero-trust PHI protection toggle switch.
- Toolbar controls: **Diagnostics Drawer Trigger**, **Format & Indent**, **Copy Payload**, and **Reset Workspace (Trash)**.

### 4. Right Studio Pane
- Multi-view workspace displaying the selected perspective with synchronized state across tabs.

---

## 3. Step-by-Step Workflow

### Step 1: Selecting or Entering an HL7 v2 Message

1. **Starting with a Blank Workspace**:
   - SemantiCare initializes with a clean, blank workspace.
   - Use the **Quick-Start Card** to paste an HL7 message from your clipboard, load a curated hospital admission, or click **Start Guided Demo**.
2. **Loading Curated Clinical Scenarios**:
   - Use the **Load workspace** dropdown in the top navbar to choose from 5 pre-configured clinical admissions (e.g. *Cardiology Admission*, *Critical Panic Labs*, *Messy Vitals*).
3. **Resetting the Workspace**:
   - Click the prominent **Reset Workspace** button in the top navbar or the trash icon in the Clinical Message editor to return to a clean, blank workspace anytime.
4. **Triggering Structural Parse vs. Full Semantic Mapping**:
   - Press `Ctrl + Enter` (or `Cmd + Enter`) in the message editor or click **Map to FHIR R4** to run the complete pipeline: PHI de-identification $\rightarrow$ AST parsing $\rightarrow$ ontology grounding $\rightarrow$ Clinical NLP extraction $\rightarrow$ FHIR Bundle construction $\rightarrow$ validation.

---

### Step 2: Zero-Trust PHI De-Identification & Re-Hydration

Patient privacy is built directly into the engine core:

1. **Enabling PHI Scrubbing**:
   - Ensure the **Zero-Trust PHI Scrubbing** toggle is switched on (default).
2. **Viewing Redacted Tokens**:
   - In the left pane, click **Inspect PHI Redaction Audit**.
   - A modal opens displaying the token vault audit:
     - Exact field locations scrubbed (e.g., `PID-3.1 [MRN]`, `PID-5.1 [Family Name]`, `PID-7 [DOB]`, `PID-11.1 [Street Address]`, `PID-13 [Phone]`, `PID-19 [SSN]`).
     - Synthetic surrogate token assigned (e.g., `[PATIENT_FAMILY_NAME_1]`).
     - Entity category breakdown counters.
3. **Re-Hydration**:
   - The token vault remains strictly local and ephemeral. When exporting, you can choose the **Re-Hydrated** flavor to restore genuine demographics into the FHIR bundle without transmitting unencrypted data over public networks.

---

### Step 3: Exploring the Structural AST Perspective

Switch to the **Structural AST** tab in the navbar:

1. **Metadata Summary**:
   - View Sending Application (`MSH-3`), Sending Facility (`MSH-4`), Receiving Application (`MSH-5`), Receiving Facility (`MSH-6`), Message Datetime (`MSH-7`), Message Type (`MSH-9`), Control ID (`MSH-10`), and HL7 Version (`MSH-12`).
2. **Segment Explorer**:
   - Segments are color-coded:
     - Blue: Standard Administration (`MSH`, `EVN`, `PID`, `PV1`, `NK1`).
     - Emerald: Clinical Results (`OBR`, `OBX`).
     - Amber: Diagnoses & Insurance (`DG1`, `IN1`).
     - Purple: Proprietary Hospital Extensions (`ZDS`, `ZTR`).
3. **Field Deep-Dive**:
   - Click on any field chip to launch the **Segment & Field Inspector Modal**.
   - Inspect repetitions, subcomponents, data types (`XPN`, `CX`, `CWE`, `NM`, `TS`), and standard definitions.

---

### Step 4: Semantic Mapping to FHIR R4 Resources

Switch to the **FHIR R4 Studio** tab in the navbar:

1. **Summary Header**:
   - View Total Resources Generated, Distinct Resource Types, Overall Confidence Score, and Validation Conformance.
2. **Visual Resource Cards**:
   - Browse generated resources:
     - `Patient`: Demographics, identifiers, contact parties, race/ethnicity extensions.
     - `Encounter`: Inpatient/outpatient status, service class, hospitalization period, discharge dispositions.
     - `Observation`: Quantitative lab values, vital signs panels, systolic/diastolic components, reference ranges, abnormal flags (`H`, `L`, `AA`).
     - `DiagnosticReport`: Clinical batteries, radiology impressions, imaging modality extensions, links to member observations.
     - `Condition`: Encounter diagnoses with ICD-10-CM codes.
     - `Coverage`: Health insurance policies, commercial payers, subscriber IDs.
3. **Resource Confidence Meter**:
   - Each card displays a confidence badge:
     - **Green (High, $\ge 90\%$)**: Deterministic mapping, standard LOINC match, or informaticist-verified rule.
     - **Yellow (Medium, $70\text{--}89\%$)**: Inferred vocabulary match or proprietary Z-segment extension.
     - **Red (Action Required, $<70\%$)**: Missing units of measure or ungrounded proprietary local codes.

---

### Step 5: Clinical NLP Entity Extraction from NTE Comments

SemantiCare extracts structured clinical data from free-text `NTE` notes:

1. **How it Works**:
   - When physician, pathologist, or radiologist narrative notes appear in `NTE-3` segments, SemantiCare analyzes the text with high-precision clinical entity models.
2. **Extracted Entities**:
   - **Provisional Conditions**: E.g., *"bibasilar atelectasis"*, *"pneumonia"*, *"hyperglycemia"* $\rightarrow$ creates a FHIR `Condition` resource with ICD-10-CM coding.
   - **Allergies**: E.g., *"Allergic to Penicillin"*, *"Allergy to Sulfa"* $\rightarrow$ creates a FHIR `AllergyIntolerance` resource with RxNorm/SNOMED CT coding.
   - **Care Recommendations**: E.g., *"Recommend HbA1c screening"*, *"Follow-up echocardiogram"* $\rightarrow$ creates a FHIR `ServiceRequest` resource with draft status.
3. **Provenance & Traceability**:
   - Each NLP-extracted resource is stamped with `meta.tag`:
     ```json
     {
       "system": "http://semanticare.health/fhir/tag",
       "code": "nte-extracted",
       "display": "Extracted from HL7 NTE Narrative Note"
     }
     ```
   - In the Studio and Lineage drawers, trace each resource directly back to its source segment (e.g. `NTE-3 (Index 1)`).

---

### Step 6: Human-in-the-Loop (HITL) Resolution Deck

When a message contains ambiguities, SemantiCare surfaces them in the **Resolution Deck**:

```
+-----------------------------------------------------------------------------------+
|  [!] OBX-6 (Index 4) • Missing Unit for Body weight                               |
|  Observation has value '82.5' but OBX-6 unit is empty. Clinical informaticist     |
|  verification required.                                                           |
|                                                                                   |
|  Select Candidate:  (o) kg (Default)     ( ) [lb_av]     ( ) g                    |
|  Or custom UCUM unit: [          ]                                                |
|                                                                                   |
|  [x] Remember in Mapping Memory for METRO_HEALTH                                  |
|                                          [Apply & Update FHIR Resource]           |
+-----------------------------------------------------------------------------------+
```

1. **Navigating to the Deck**:
   - Click **Resolution Deck** in the top navbar (or click the amber banner on any low-confidence card).
2. **Resolving Missing UCUM Units**:
   - Review the candidate options (e.g., `kg` vs. `[lb_av]`).
   - Select your choice, or enter a custom UCUM string (e.g., `mmol/L`).
3. **Resolving Local Terminology**:
   - Review ranked LOINC candidates matching the local hospital analyte description.
   - Select the matching LOINC code.
4. **Applying Resolutions**:
   - Ensure the checkbox **"Remember in Mapping Memory for [Facility]"** is checked (checked by default).
   - Click **Apply & Update FHIR Resource**.
   - The in-memory FHIR Bundle updates instantly, the ambiguity badge clears, and the confidence score jumps to 100%!

---

### Step 7: Institutional Mapping Memory & Rulebase Management

SemantiCare learns from informaticist decisions so you never have to solve the same ambiguity twice:

1. **Opening Mapping Memory**:
   - Click the **Memory** button in the top navbar.
   - The **Institutional Mapping Memory & Rulebase** modal displays all active learned rules.
2. **Exploring Rules**:
   - Filter rules by facility (`METRO_HEALTH`, `METRO_CARDIO`, or `* Global`).
   - Filter by rule category (`Unit Normalization`, `Local Terminology`, `Z-Segment Mapping`).
   - Review the **Applied Count** badge (e.g. `Applied 6×`) to track rule utilization.
3. **Adding Rules Manually**:
   - Click **+ Add Rule**.
   - Enter Sending Facility (or `*` for all hospitals), Rule Category, Source Code (e.g. `BP_LOCAL`), Target Standard Value (e.g. `85354-9`), Display Name, Author, and Governance Notes.
   - Click **Save Rule**.
4. **Exporting as FHIR `ConceptMap`**:
   - Click **Export ConceptMap** in the modal toolbar.
   - Downloads a standard `semanticare-conceptmap-YYYY-MM-DD.json` file conforming to the HL7 FHIR R4 `ConceptMap` specification.
5. **Deleting Obsolete Rules**:
   - Click the trash icon next to any rule to remove it from SQLite.

---

### Step 8: FHIR R4 & US Core Conformance Validation

Verify that your FHIR bundles comply with standards:

1. **Switching to Validation Perspective**:
   - Click **Validation** in the top navbar.
2. **Selecting Profiles**:
   - Toggle between **US Core 3.1.1** (strict ONC compliance) and **HL7 Base R4**.
3. **Reviewing Conformance**:
   - **Conformance Score Meter**: View score percentage (e.g., `97%` or `100%`).
   - **Issue Summary Cards**: Highlighting total Errors, Warnings, and Informational notes.
   - **Resource-by-Resource Inspection**: Click any resource to see its validation status and line-level issue paths (e.g. `Patient.extension[us-core-ethnicity]`).

---

### Step 9: In-Browser Monaco JSON Editing & Live Mutation

For deep inspection and custom tweaks:

1. **Accessing the Editor**:
   - In the **FHIR R4 Studio** tab, click **Monaco JSON Editor** in the sub-toolbar.
2. **Features**:
   - Full VS Code Monaco editor with syntax highlighting, line numbers, and error indicators.
   - **Format JSON**: Auto-indent and clean formatting.
   - **Direct Live Edits**: Modify any value, coding, or extension directly. SemantiCare re-validates the modified bundle in real-time!
   - **Reset to Baseline**: Discard manual edits and re-generate the clean algorithmic translation.

---

### Step 10: Exporting Bundles & Transmitting to FHIR Stores

When your mapping and validation are complete:

1. **Click Export in Navbar**:
   - Opens the **Export & Transmit Modal**.
2. **Choosing Flavor**:
   - **De-Identified (Zero-Trust)**: Uses synthetic surrogate tokens. Safe for ML pipelines, public benchmarks, and secondary research.
   - **Re-Hydrated (PHI Restored)**: Restores patient names, MRNs, and addresses from the local token vault for production hospital ingestion.
3. **Downloading Files**:
   - **Standard FHIR Transaction Bundle (JSON)**: `semanticare-bundle-xxxx.json`.
   - **Bulk FHIR (NDJSON)**: Newline-delimited JSON format for cloud data lake ingestion (BigQuery, Snowflake, AWS S3).
4. **Pushing to Live FHIR Servers**:
   - Select the **Direct FHIR Push Gateway** tab in the modal.
   - Enter your target FHIR server endpoint (e.g. `https://hapi.fhir.org/baseR4`, Google Cloud Healthcare API, AWS HealthLake, or Smile CDR).
   - Enter your Bearer token if authentication is enabled.
   - Click **Transmit Bundle**.
   - Review live HTTP response codes (`200 OK`, `201 Created`) and server transaction responses.

### Step 11: Interactive Guided Clinical Demo & Walkthrough

1. **Launching the Tour**:
   - Click **Guided Demo** in the top navigation bar or **Start Guided Demo** on the blank workspace quick-start card.
   - The interactive tour panel opens in the lower viewport.
2. **Navigating Steps**:
   - Step 1: **Clinical Ingestion & Structural Linting** (Demonstrates feed ingestion from blank canvas and delimiter parsing).
   - Step 2: **EHR Patient Banner & Zero-Trust Token Vault** (Shows surrogate tokens vs. re-hydrated identity).
   - Step 3: **Human-in-the-Loop Ambiguity Resolution** (Surfaces missing UCUM units and local terminology for informaticist review).
   - Step 4: **Semantic FHIR R4 Bundle Studio** (Inspects resource cards, JSON Monaco diff, and DAG provenance tree).
   - Step 5: **US Core 3.1.1 Conformance & Bulk Export** (Validates 100% US Core compliance and bulk export).
3. **Dynamic State Synchronization**:
   - Stepping back to Step 1 automatically resets the workspace to blank.
   - Stepping to Step 2 guarantees PHI protection is active.
   - Stepping to Step 3 dynamically resets resolved ambiguities back to unreviewed so informaticist review can be demonstrated repeatedly.
4. **Auto-Play Mode**:
   - Click the **Play** button in the tour header to begin a 10-second automatic progression through all five phases.
   - Pause or resume anytime.
5. **Finishing and Resetting**:
   - Click **Finish & Reset** on Step 5 to clear the workspace and close the tour, or **Finish & Keep Case** to retain the mapped bundle for further exploration.

---

## 4. Curated Clinical Scenarios Guide

SemantiCare comes pre-loaded with 5 representative clinical scenarios designed to showcase typical healthcare workflows:

### Scenario 1: `ADT^A01` - Inpatient Hospital Admission
- **Clinical Context**: 54-year-old female admitted through the emergency department to an inpatient medical-surgical floor.
- **Key Segments**: `MSH`, `EVN`, `PID`, `NK1`, `PV1`, `DG1`, `IN1`.
- **Generated FHIR Resources**: `Patient`, `Encounter`, `Condition` (Bacterial pneumonia, ICD-10 J18.9), `Coverage` (Commercial insurer).
- **Informatics Highlights**: Complete demographics parsing, Next of Kin mapping, attending physician NPI attribution, insurance policy grounding.

### Scenario 2: `ORU^R01` - Comprehensive Metabolic & CBC Lab Results
- **Clinical Context**: Outpatient lab battery from an automated chemistry analyzer containing standard serum electrolytes and blood counts.
- **Key Segments**: `MSH`, `PID`, `PV1`, `ORC`, `OBR`, `OBX` (5 tests), `NTE`.
- **Generated FHIR Resources**: `Patient`, `Encounter`, `DiagnosticReport`, `Observation` (Glucose, Sodium, Potassium, BUN, Creatinine), `Condition` (Hyperglycemia from NTE), `ServiceRequest` (HbA1c screening proposal from NTE).
- **Informatics Highlights**: Abnormal flags (`H`, `L`), LOINC top-lab mapping, reference range extraction, Clinical NLP narrative extraction.

### Scenario 3: `ORU^R01` - Vital Signs with Semantic Ambiguities (HITL Showcase)
- **Clinical Context**: Unstructured bedside monitor vitals flow sheet from an Intensive Care Unit bed.
- **Key Segments**: `MSH`, `PID`, `PV1`, `OBR`, `OBX` (Body temp in Fahrenheit, compound blood pressure `138/88`, heart rate, body weight with empty unit, oxygen saturation), `NTE`.
- **Generated FHIR Resources**: `Patient`, `Encounter`, `DiagnosticReport`, `Observation` (Decomposed systolic & diastolic BP, temperature, HR, weight, SpO2).
- **Informatics Highlights**:
  - Compound Blood Pressure parsing: Decomposes string `138/88` into standard systolic (`8480-6`, 138 mm[Hg]) and diastolic (`8462-4`, 88 mm[Hg]) FHIR components.
  - Missing Unit on Weight: Flags `OBX-6` empty unit on weight `82.5` for informaticist resolution.
  - Mapping Memory Demo: Resolving this ambiguity and checking "Remember rule" ensures subsequent messages from `ICU_BED_3` automatically map to `kg`!

### Scenario 4: `ORU^R01` - Radiology Order with Proprietary Z-Segments
- **Clinical Context**: PACS radiology report containing site-specific non-standard hospital segments.
- **Key Segments**: `MSH`, `PID`, `PV1`, `OBR`, `ZDS` (DICOM Study UID, Modality CR), `ZTR` (Patient Transport Mode Wheelchair), `OBX`, `NTE`.
- **Generated FHIR Resources**: `Patient`, `Encounter` (with Transport Mode extension), `DiagnosticReport` (with DICOM Study UID and Modality extension), `Observation`.
- **Informatics Highlights**: Demonstrates how SemantiCare rescues custom vendor extensions that would normally break strict FHIR converters.

### Scenario 5: `ADT^A08` - Cardiology Visit with Dual Diagnoses & Insurance
- **Clinical Context**: Outpatient cardiology clinic visit for a patient with chronic ischemic heart disease and hypertension.
- **Key Segments**: `MSH`, `EVN`, `PID`, `NK1`, `PV1`, `DG1` (Dual diagnoses: I25.10 & I10), `IN1`, `NTE`.
- **Generated FHIR Resources**: `Patient`, `Encounter`, `Condition` (Coronary artery disease & Essential hypertension), `Coverage` (Aetna PPO), `ServiceRequest` (Follow-up echocardiogram from NTE).
- **Informatics Highlights**: Multi-diagnosis prioritization, encounter-diagnosis category mapping, subscriber relationship coding.

---

## 5. Institutional Knowledge Base & ConceptMap Interoperability

### How SemantiCare Implements Persistent Learning

```
[ Incoming HL7 Message ]
            |
            v
+-------------------------------+
|  Extract Facility (MSH-4/6)   |  --> E.g. "METRO_HEALTH"
+---------------+---------------+
                |
                v
+-------------------------------+
| Check SQLite Mapping Memory   |  --> 1. Check METRO_HEALTH + source_key
+---------------+---------------+      2. Fallback to '*' Global + source_key
                |
       +--------+--------+
       |                 |
 [Rule Found]      [Rule Missing]
       |                 |
       v                 v
[Auto-Resolve]     [Surface Card in]
[Confidence: 100%] [Resolution Deck]
                         |
                   (Informaticist)
                   [Resolve & Save]
                         |
                         v
                   [Write to SQLite]
```

### ConceptMap Interoperability
When you click **Export ConceptMap** in the Mapping Memory modal, SemantiCare generates a compliant FHIR `ConceptMap` resource:
- **Canonical Structure**: Uses standard `http://hl7.org/fhir/StructureDefinition/ConceptMap`.
- **Source and Target Elements**: Maps hospital-specific codes to standard LOINC codes with equivalence semantics (`equivalent`).
- **Audit Lineage**: Documents the facility, creating author, and governance notes for every mapping rule.

---

## 6. Best Practices & Informaticist Tips

1. **Always Review High-Risk Analyte Units**:
   - For pediatric and neonatology units, always confirm whether weight measurements represent kilograms (`kg`) or grams (`g`).
2. **Use Global Rules Sparingly**:
   - When adding rules in Mapping Memory, prefer specifying the hospital code (`MSH-4`) over global wildcard (`*`) unless the convention is hospital-system wide.
3. **Inspect the Conformance Score Before Production Push**:
   - Ensure the Conformance Score is $\ge 95\%$ before transmitting bundles to production FHIR servers.
4. **Use Bulk NDJSON for Data Warehousing**:
   - When loading mapped messages into BigQuery, Snowflake, or AWS Athena, export as Bulk NDJSON rather than a monolithic transaction bundle for faster parallel ingestion.
5. **Verify Re-Hydration Token Vault Security**:
   - Re-hydration should only be performed in secure environments where the end-user has appropriate HIPAA role-based access to PHI.

---

## 7. Troubleshooting & FAQs

### Q: Why is my message confidence score below 100%?
**A**: A confidence score below 100% indicates that the message contained unresolved semantic ambiguities (such as missing units of measure, inferred terminology, or unverified Z-segments). Navigate to the **Resolution Deck**, resolve the highlighted cards, and your score will increase to 100%.

### Q: How do I handle HL7 messages with non-standard delimiters?
**A**: SemantiCare reads the delimiter definition directly from the `MSH-1` and `MSH-2` header fields dynamically. It supports non-standard separators automatically without configuration.

### Q: Can I run SemantiCare completely offline without internet connectivity?
**A**: Yes. SemantiCare uses local embedded dictionaries (LOINC catalogs, UCUM validators, SQLite, and in-memory Pydantic validation models). It requires zero external cloud API calls for parsing, mapping, or validation.

### Q: Where is the SQLite Mapping Memory database stored?
**A**: The database is stored at [`backend/app/data/mapping_rules.db`](file:///c:/Coding/Healthcare/backend/app/data/mapping_rules.db). You can back up, clone, or migrate this single file across environments.

### Q: How do I connect SemantiCare to our hospital HAPI FHIR or Google Cloud Healthcare API?
**A**: Open the **Export** modal in the top navbar, select the **Direct FHIR Push Gateway** tab, enter your FHIR store base URL and Bearer token, and click **Transmit Bundle**.

---

*SemantiCare Documentation Suite • Developed for clinical interoperability teams.*
