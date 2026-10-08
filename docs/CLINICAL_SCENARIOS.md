# Clinical Test Scenarios & Informatics Guide

SemantiCare includes five curated, pre-loaded clinical scenarios representing real-world electronic health record (EHR), laboratory information system (LIS), and picture archiving system (PACS) data streams.

All scenarios use synthetic data compliant with the **HIPAA Safe Harbor** de-identification standard.

---

## Scenario Overview Matrix

| # | Trigger Event | Clinical Context | Source EHR / Device | Mapped FHIR Resources | Ambiguities / Edge Cases |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | `ADT^A01` | Inpatient Admission | Epic Systems EHR | `Patient`, `Encounter`, `Condition`, `Coverage` | Structured demographics, NPI physician, room/bed assignment |
| **2** | `ORU^R01` | CMP & CBC Lab Battery | Roche Cobas 8000 LIS | `Patient`, `Encounter`, `DiagnosticReport`, `Observation` (x5) | Abnormal flags (`H`, `L`), reference intervals, `NTE` notes |
| **3** | `ORU^R01` | Bedside Vitals Flowsheet | Philips IntelliVue ICU Monitor | `Patient`, `Encounter`, `DiagnosticReport`, `Observation` (x5) | Missing weight unit, compound blood pressure (`138/88`), Fahrenheit temp |
| **4** | `ORU^R01` | Chest X-Ray Imaging Study | GE Centricity PACS | `Patient`, `Encounter`, `DiagnosticReport`, `Observation` | Proprietary `ZDS` (DICOM Study) & `ZTR` (Transport isolation) segments |
| **5** | `ADT^A08` | Cardiology Specialty Visit | Allscripts TouchWorks EHR | `Patient`, `Encounter`, `Condition` (x2), `Coverage` | Dual diagnoses (CAD & Hypertension), daughter contact, Aetna Choice coverage |

---

## Scenario 1: `ADT^A01`: Inpatient Hospital Admission

### Clinical Narrative
A 42-year-old female presents to the Emergency Department with progressive fever, dyspnea, and productive cough. Following chest imaging, she is formally admitted as an inpatient to the 4-West Medical Unit (Bed 402-A) under attending physician Dr. Carlos M. Rivera for acute pneumonia. Her spouse is designated as the primary emergency contact, and she carries active Blue Cross Blue Shield PPO coverage.

### Raw HL7 v2 Message
```hl7
MSH|^~\&|EPIC_EHR|METRO_HEALTH|INTEGRATION_HUB|CENTRAL_HOSP|20261006143000||ADT^A01^ADT_A01|MSG20261006001|P|2.5.1|||AL|NE
EVN|A01|20261006143000|||DR_SMITH|20261006142500
PID|1||MRN987654321^^^METRO_HEALTH^MR||EVERGREEN^ELEANOR^CLAIRE||19840512|F||2106-3^White^CDCREC|452 COMMONWEALTH AVE^^BOSTON^MA^02215^USA||(617)555-0199||ENG|M||ACCT2026-9912|999-88-7777||2186-5^Not Hispanic or Latino^CDCREC
NK1|1|EVERGREEN^THOMAS^EDWARD|SPO^Spouse^HL70063|452 COMMONWEALTH AVE^^BOSTON^MA^02215^USA|(617)555-0198
PV1|1|I|MED^4WEST^402-A|EMER|||1234567890^RIVERA^CARLOS^M^DR^MD^^^NPI|9876543210^CHEN^WEI^DR^^^NPI||MED||||EMER|||V202600845|COMM|||||||||||||||||||||||||20261006142500
DG1|1|I10|J18.9^Pneumonia, unspecified organism|Pneumonia, unspecified|20261006143000|A
IN1|1|BCBS001|BCBS_MA^Blue Cross Blue Shield MA|BLUE CROSS BLUE SHIELD|PO BOX 1234^^BOSTON^MA^02101||||||||||PPO||||||||||||||||||POL99882211
```

### Informatics Mapping Breakdown
* **`PID` $\rightarrow$ FHIR `Patient`**:
  * `PID-3`: Medical Record Number `MRN987654321` assigned under system `urn:oid:metro_health`.
  * `PID-5`: Structured name mapped to `use="official"`, `family="EVERGREEN"`, `given=["ELEANOR", "CLAIRE"]`.
  * `PID-10` / `PID-22`: Mapped to official CDC Race and Ethnicity OMB categories (`2106-3` White, `2186-5` Not Hispanic).
  * `NK1`: Structured next-of-kin contact record with `relationship="SPO"` (Spouse).
* **`PV1` $\rightarrow$ FHIR `Encounter`**:
  * `PV1-2`: Patient Class `I` mapped to FHIR `v3-ActCode` `IMP` (inpatient encounter).
  * `PV1-3`: Room and bed hierarchy assigned under `Encounter.location`.
  * `PV1-7`: Attending physician Dr. Rivera with NPI `1234567890` mapped to `Encounter.participant`.
* **`DG1` $\rightarrow$ FHIR `Condition`**:
  * ICD-10-CM code `J18.9` (Pneumonia) mapped to active condition with `category="encounter-diagnosis"`.
* **`IN1` $\rightarrow$ FHIR `Coverage`**:
  * Blue Cross Blue Shield policy `POL99882211` mapped to active insurance coverage.

---

## Scenario 2: `ORU^R01`: Comprehensive Metabolic & CBC Lab Results

### Clinical Narrative
A morning laboratory draw from the central chemistry lab yields a Comprehensive Metabolic Panel (CMP). Automated photometric and ion-selective electrode analyzers flag elevated fasting blood glucose (`165 mg/dL`) and mild hyponatremia (`132 mmol/L`). Other chemistries (Potassium, Creatinine, BUN) remain within reference intervals. A pathologist NTE narrative emphasizes follow-up diabetic screening.

### Raw HL7 v2 Message
```hl7
MSH|^~\&|COBAS_8000|CENTRAL_LAB|EPIC_EHR|METRO_HEALTH|20261006154500||ORU^R01^ORU_R01|LAB20261006901|P|2.5.1|||AL|NE
PID|1||MRN987654321^^^METRO_HEALTH^MR||EVERGREEN^ELEANOR^CLAIRE||19840512|F
PV1|1|I|MED^4WEST^402-A
ORC|RE|ORD20261006-11|LIS20261006-99||CM||^^^20261006150000||20261006150500|1234567890^RIVERA^CARLOS^M^DR
OBR|1|ORD20261006-11|LIS20261006-99|24323-8^Comprehensive Metabolic Panel^LN|||20261006150000|||||||||1234567890^RIVERA^CARLOS^M^DR|||||20261006154000|||F
OBX|1|NM|2345-7^Glucose [Mass/volume] in Serum or Plasma^LN||165|mg/dL|70-99|H|||F|||20261006152000|CENTRAL_LAB
OBX|2|NM|2951-2^Sodium [Moles/volume] in Serum or Plasma^LN||132|mmol/L|136-145|L|||F|||20261006152100|CENTRAL_LAB
OBX|3|NM|2823-3^Potassium [Moles/volume] in Serum or Plasma^LN||4.2|mmol/L|3.5-5.1|N|||F|||20261006152200|CENTRAL_LAB
OBX|4|NM|2160-0^Creatinine [Mass/volume] in Serum or Plasma^LN||1.05|mg/dL|0.50-1.10|N|||F|||20261006152300|CENTRAL_LAB
OBX|5|NM|3094-0^Blood Urea Nitrogen [Mass/volume] in Serum or Plasma^LN||18|mg/dL|7-20|N|||F|||20261006152400|CENTRAL_LAB
NTE|1|L|Elevated fasting glucose noted. Recommend HbA1c screening if persistent.
```

### Informatics Mapping Breakdown
* **`OBR` $\rightarrow$ FHIR `DiagnosticReport`**:
  * LOINC battery code `24323-8` (CMP) mapped with `status="final"`.
  * `NTE-3` pathologist comment mapped to `DiagnosticReport.conclusion`.
  * `DiagnosticReport.result` holds relative URN references to all five mapped `Observation` resources.
* **`OBX` $\rightarrow$ FHIR `Observation`**:
  * `OBX-2="NM"` mapped to `Observation.valueQuantity` with numeric value and verified UCUM unit (`mg/dL`, `mmol/L`).
  * `OBX-7` reference range `70-99` parsed into `Observation.referenceRange.low` (`70`) and `high` (`99`).
  * `OBX-8` abnormal flag `H` mapped to `v3-ObservationInterpretation` code `H` ("High").

---

## Scenario 3: `ORU^R01`: Vital Signs with Semantic Ambiguities

### Clinical Narrative
A continuous bedside patient monitor in the Intensive Care Unit generates an automated periodic vitals snapshot. This message reflects common telemetry integration defects:
1. Patient weight is emitted as `82.5` with an empty `OBX-6` unit field.
2. Blood pressure is emitted as a composite string (`138/88`) under a local non-standard test identifier `BP_LOCAL`.
3. Body temperature is recorded in Fahrenheit (`99.6 [degF]`).
4. An `NTE` note indicates patient restlessness during weighing.

### Raw HL7 v2 Message
```hl7
MSH|^~\&|PHILIPS_INTELLIVUE|ICU_BED_3|EPIC_EHR|METRO_HEALTH|20261006160000||ORU^R01|VIT20261006004|P|2.3
PID|1||MRN554433221^^^METRO_HEALTH^MR||MARTINEZ^MARIA^ROSA||19720918|F
PV1|1|I|ICU^BED3^01
OBR|1||VIT20261006-44|883-9^Vital Signs Panel^LN|||20261006155500
OBX|1|NM|8310-5^Body temperature^LN||99.6|[degF]|97.0-99.0|H|||F
OBX|2|ST|BP_LOCAL^Non-Invasive Blood Pressure^LOCAL||138/88|mm[Hg]|90-120/60-80|H|||F
OBX|3|NM|8867-4^Heart rate^LN||84|/min|60-100|N|||F
OBX|4|NM|29463-7^Body weight^LN||82.5||||||F
OBX|5|NM|59408-5^Oxygen saturation in Arterial blood by Pulse oximetry^LN||97|%|95-100|N|||F
NTE|1|O|Patient restless during weight measurement; scale zeroed prior to standing.
```

### Ambiguities Flagged for Human-in-the-Loop Review
* **`MISSING_UNIT` Flag on `OBX-4` (Body Weight `82.5`)**:
  * *Clinical Risk*: Confusion between `kg` (181.8 lbs) and `[lb_av]` (37.4 kg) represents a severe pediatric/adult medication dosing hazard.
  * *Resolution Deck Action*: The UI prompts the informaticist to select `kg` (recommended for adult hospital telemetry) or `[lb_av]`.
* **`LOCAL_TERMINOLOGY` Flag on `OBX-2` (`BP_LOCAL`)**:
  * *Grounded Mapping*: The terminology engine fuzzy-matches `BP_LOCAL` to LOINC `85354-9` (Blood pressure panel).
  * *Resolution Deck Action*: Informaticist confirms or overrides the LOINC candidate.
* **`COMPOUND_VALUE` Flag on `OBX-2` (`138/88`)**:
  * *Decomposition*: The parser splits the compound value into standard US Core components:
    * Systolic: `138 mm[Hg]` (LOINC `8480-6`)
    * Diastolic: `88 mm[Hg]` (LOINC `8462-4`)

---

## Scenario 4: `ORU^R01`: Radiology Order with Proprietary Z-Segments

### Clinical Narrative
A digitized portable Chest X-Ray study from a hospital PACS system is transmitted following imaging acquisition. In addition to standard radiologist narrative impressions, the sending interface includes custom hospital Z-segments:
1. `ZDS`: DICOM Study UID, imaging modality (`CR`), study description, and imaging room identifier.
2. `ZTR`: Patient transport mode (`WHEELCHAIR`), contact isolation protocol, and oxygen support.

Naive HL7 parsers drop or fail on Z-segments; SemantiCare detects and translates them into structured FHIR extensions.

### Raw HL7 v2 Message
```hl7
MSH|^~\&|GE_CENTRICITY_PACS|RADIOLOGY|EPIC_EHR|METRO_HEALTH|20261006161500||ORU^R01|RAD2026100688|P|2.5
PID|1||MRN987654321^^^METRO_HEALTH^MR||EVERGREEN^ELEANOR^CLAIRE||19840512|F
PV1|1|I|MED^4WEST^402-A
OBR|1|RAD-2026-881|PACS-99214|71020^Chest X-Ray 2 Views PA and Lateral^CPT4|||20261006153000|||||||||1234567890^RIVERA^CARLOS^M^DR|||||20261006161000|||F
ZDS|1|1.2.840.113619.2.55.3.4|CR|Chest PA/LAT|ROOM_RAD_02|2|STATION_04^TECH_JOHNSON
ZTR|1|WHEELCHAIR|CONTACT_ISOLATION|NURSE_ESCORT_REQUIRED|O2_PRESCRIBED_2L
OBX|1|TX|18748-4^Diagnostic imaging report^LN||Findings: Bilateral basilar atelectasis noted. No pneumothorax. Heart size normal.||||||F
NTE|1|L|IMPRESSION: Mild bibasilar infiltrate consistent with early bronchopneumonia. Clinical correlation recommended.
```

### Informatics Mapping Breakdown
* **`ZDS` $\rightarrow$ `DiagnosticReport.extension`**:
  * DICOM Study Instance UID `1.2.840.113619.2.55.3.4` and Modality `CR` are encapsulated in a custom imaging metadata extension.
* **`ZTR` $\rightarrow$ `Encounter.extension`**:
  * Transport protocol `WHEELCHAIR` and contact isolation directives are attached to the hospital admission encounter.
* **`OBX` + `NTE` $\rightarrow$ `DiagnosticReport`**:
  * Radiologist findings and clinical impression are compiled into `DiagnosticReport.conclusion`.

---

## Scenario 5: `ADT^A08`: Cardiology Visit with Dual Diagnoses & Insurance

### Clinical Narrative
A 68-year-old male with chronic cardiovascular disease attends a scheduled outpatient follow-up at the Metro Cardiology Clinic. The EHR emits an `ADT^A08` patient information update message. The visit documents two chronic conditions: primary coronary artery disease (CAD) without angina (ICD-10 `I25.10`) and essential hypertension (ICD-10 `I10`). Demographics specify Spanish language preference, his daughter as primary emergency contact, and active Aetna Choice POS II commercial insurance.

### Raw HL7 v2 Message
```hl7
MSH|^~\&|ALLSCRIPTS_EHR|METRO_CARDIO|INTEGRATION_HUB|CENTRAL_HOSP|20261006170000||ADT^A08^ADT_A08|MSG20261006883|P|2.5.1|||AL|NE
EVN|A08|20261006170000|||DR_KAPLAN|20261006165500
PID|1||MRN443322119^^^METRO_CARDIO^MR||GARCIA^ROBERTO^LUIS||19580324|M||2106-3^White^CDCREC|782 BEACON ST^^BOSTON^MA^02215^USA||(617)555-0812||SPA|M||ACCT8899120|999-33-2211||2135-2^Hispanic or Latino^CDCREC
NK1|1|GARCIA^SOFIA^ELENA|DAU^Natural Daughter^HL70063|782 BEACON ST^^BOSTON^MA^02215^USA|(617)555-0814
PV1|1|O|CARDIO^CLINIC_A^EXAM_3|ROUT|||4455667788^KAPLAN^ROBERT^A^DR^MD^^^NPI|||CARDIO||||ROUT|||V202609912|COMM|||||||||||||||||||||||||20261006165500
DG1|1|I10|I25.10^Atherosclerotic heart disease of native coronary artery without angina pectoris^ICD10|Coronary Artery Disease|20261006170000|A
DG1|2|I10|I10^Essential (primary) hypertension^ICD10|Essential Hypertension|20261006170000|W
IN1|1|AETNA01|AETNA_CHOICE^Aetna Choice POS II|AETNA HEALTHCARE|PO BOX 981106^^EL PASO^TX^79998||||||||||POS||||||||||||||||||POL44556611
NTE|1|P|Patient scheduled for 6-month echocardiogram follow-up and lipid panel review.
```

### Informatics Mapping Breakdown
* **Multi-Condition Mapping (`DG1` #1 & `DG1` #2)**:
  * Generates two separate FHIR `Condition` resources linked to the patient and encounter:
    * `Condition 1`: ICD-10-CM `I25.10` (Atherosclerotic heart disease), `clinicalStatus="active"`, `category="encounter-diagnosis"`.
    * `Condition 2`: ICD-10-CM `I10` (Essential hypertension), `clinicalStatus="active"`, `category="encounter-diagnosis"`.
* **Outpatient Ambulatory Encounter (`PV1`)**:
  * `PV1-2="O"` mapped to FHIR `v3-ActCode` `AMB` (ambulatory specialty clinic).
  * Attending cardiologist Dr. Robert Kaplan with NPI `4455667788` linked as practitioner.
* **Commercial Payer Coverage (`IN1`)**:
  * Aetna Choice POS II policy `POL44556611` mapped to active `Coverage` resource.
