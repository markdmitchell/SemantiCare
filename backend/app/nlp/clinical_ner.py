"""
Clinical NLP & Narrative Entity Extractor for HL7 NTE Segments
Extracts structured clinical findings (Conditions), drug allergies (AllergyIntolerance),
and care plan recommendations (ServiceRequest) from unstructured physician/pathologist notes.
"""

import re
import uuid
from typing import Any
from dataclasses import dataclass, field


@dataclass
class ExtractedClinicalEntity:
    entity_type: str  # "CONDITION", "ALLERGY", "RECOMMENDATION"
    text: str
    code: str
    display: str
    system: str
    confidence: float
    source_segment: str
    fhir_resource: dict[str, Any]


CLINICAL_PATTERNS = {
    "conditions": [
        (r"\b(bronchopneumonia|pneumonia)\b", "J18.9", "Pneumonia, unspecified organism", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(atelectasis|basilar atelectasis)\b", "J98.11", "Atelectasis", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(pleural effusion)\b", "J90", "Pleural effusion, not elsewhere classified", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(infiltrate|bibasilar infiltrate)\b", "R91.8", "Other nonspecific abnormal findings of lung field", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(elevated (?:fasting )?glucose|hyperglycemia)\b", "R73.9", "Hyperglycemia, unspecified", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(hypertension|htn)\b", "I10", "Essential (primary) hypertension", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(hyponatremia)\b", "E87.1", "Hypo-osmolality and hyponatremia", "http://hl7.org/fhir/sid/icd-10-cm"),
        (r"\b(cardiomegaly)\b", "I51.7", "Cardiomegaly", "http://hl7.org/fhir/sid/icd-10-cm"),
    ],
    "allergies": [
        (r"\b(?:allergic to|allergy to|reaction to)\s+(penicillin|amoxicillin)\b", "70618", "Penicillin", "http://www.nlm.nih.gov/research/umls/rxnorm", "high"),
        (r"\b(?:allergic to|allergy to|reaction to)\s+(sulfa|sulfonamides?)\b", "9944", "Sulfonamide", "http://www.nlm.nih.gov/research/umls/rxnorm", "high"),
        (r"\b(?:allergic to|allergy to|reaction to)\s+(aspirin|asa)\b", "1191", "Aspirin", "http://www.nlm.nih.gov/research/umls/rxnorm", "medium"),
        (r"\b(?:allergic to|allergy to|reaction to)\s+(latex)\b", "111088007", "Latex", "http://snomed.info/sct", "high"),
        (r"\b(?:allergic to|allergy to|reaction to)\s+(iodine|contrast)\b", "387406002", "Iodine contrast media", "http://snomed.info/sct", "high"),
    ],
    "recommendations": [
        (r"\b(?:recommend|recommended|consider)\s+([a-z0-9\s\-]+screening|[a-z0-9\s\-]+panel|[a-z0-9\s\-]+test)\b", "4548-4", "Hemoglobin A1c screening recommendation"),
        (r"\b(?:scheduled for|follow-up)\s+([a-z0-9\s\-]+follow-up|[a-z0-9\s\-]+echocardiogram|[a-z0-9\s\-]+consult)\b", "40701008", "Clinical Follow-Up Recommendation"),
    ],
}


def extract_entities_from_nte(
    nte_text: str,
    patient_urn: str,
    encounter_urn: str,
    source_seg_id: str = "NTE-3",
) -> list[ExtractedClinicalEntity]:
    """
    Parses unstructured clinical narrative in NTE comments and emits structured FHIR entities.
    """
    if not nte_text or not nte_text.strip():
        return []

    clean_text = nte_text.strip()
    lower_text = clean_text.lower()
    entities: list[ExtractedClinicalEntity] = []

    # 1. Condition & Findings Extraction
    for regex_pat, code, display, system in CLINICAL_PATTERNS["conditions"]:
        match = re.search(regex_pat, lower_text)
        if match:
            matched_phrase = match.group(0)
            cond_id = f"cond-nte-{uuid.uuid4().hex[:8]}"
            resource = {
                "resourceType": "Condition",
                "id": cond_id,
                "meta": {
                    "tag": [
                        {
                            "system": "http://semanticare.health/tags",
                            "code": "nte-extracted",
                            "display": "Extracted from NTE Clinical Narrative",
                        }
                    ]
                },
                "clinicalStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                        "display": "Active",
                    }]
                },
                "verificationStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "provisional",
                        "display": "Provisional / Derived",
                    }]
                },
                "category": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                        "code": "clinical-finding",
                        "display": "Clinical Finding",
                    }]
                }],
                "code": {
                    "coding": [{
                        "system": system,
                        "code": code,
                        "display": display,
                    }],
                    "text": display,
                },
                "subject": {"reference": patient_urn},
                "encounter": {"reference": encounter_urn},
                "note": [{"text": f"Extracted from {source_seg_id}: \"{clean_text}\""}],
            }

            entities.append(
                ExtractedClinicalEntity(
                    entity_type="CONDITION",
                    text=matched_phrase,
                    code=code,
                    display=display,
                    system=system,
                    confidence=0.92,
                    source_segment=source_seg_id,
                    fhir_resource=resource,
                )
            )

    # 2. Allergy & Intolerance Extraction
    for regex_pat, code, display, system, criticality in CLINICAL_PATTERNS["allergies"]:
        match = re.search(regex_pat, lower_text)
        if match:
            matched_substance = match.group(1) if match.groups() else match.group(0)
            allergy_id = f"alg-nte-{uuid.uuid4().hex[:8]}"
            resource = {
                "resourceType": "AllergyIntolerance",
                "id": allergy_id,
                "meta": {
                    "tag": [
                        {
                            "system": "http://semanticare.health/tags",
                            "code": "nte-extracted",
                            "display": "Extracted from NTE Clinical Narrative",
                        }
                    ]
                },
                "clinicalStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        "code": "active",
                    }]
                },
                "verificationStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
                        "code": "confirmed",
                    }]
                },
                "type": "allergy",
                "category": ["medication"],
                "criticality": criticality,
                "code": {
                    "coding": [{
                        "system": system,
                        "code": code,
                        "display": display,
                    }],
                    "text": display,
                },
                "patient": {"reference": patient_urn},
                "note": [{"text": f"Extracted from {source_seg_id}: \"{clean_text}\""}],
            }

            entities.append(
                ExtractedClinicalEntity(
                    entity_type="ALLERGY",
                    text=matched_substance,
                    code=code,
                    display=display,
                    system=system,
                    confidence=0.95,
                    source_segment=source_seg_id,
                    fhir_resource=resource,
                )
            )

    # 3. Care Recommendations / Proposals
    for regex_pat, default_code, default_display in CLINICAL_PATTERNS["recommendations"]:
        match = re.search(regex_pat, lower_text)
        if match:
            rec_text = match.group(0)
            req_id = f"sr-nte-{uuid.uuid4().hex[:8]}"
            resource = {
                "resourceType": "ServiceRequest",
                "id": req_id,
                "meta": {
                    "tag": [
                        {
                            "system": "http://semanticare.health/tags",
                            "code": "nte-extracted",
                            "display": "Extracted from NTE Clinical Narrative",
                        }
                    ]
                },
                "status": "draft",
                "intent": "proposal",
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": default_code,
                        "display": default_display,
                    }],
                    "text": rec_text.capitalize(),
                },
                "subject": {"reference": patient_urn},
                "encounter": {"reference": encounter_urn},
                "note": [{"text": f"Recommendation from {source_seg_id}: \"{clean_text}\""}],
            }

            entities.append(
                ExtractedClinicalEntity(
                    entity_type="RECOMMENDATION",
                    text=rec_text,
                    code=default_code,
                    display=default_display,
                    system="http://snomed.info/sct",
                    confidence=0.88,
                    source_segment=source_seg_id,
                    fhir_resource=resource,
                )
            )

    return entities
