"""
Semantic Data Mapping Engine (HL7 v2 to FHIR R4)
Transforms structural HL7 v2 AST into valid FHIR R4 Bundles using
deterministic baselines, terminology grounding, and semantic reasoning.
"""

from typing import Any
import uuid
import re
from datetime import datetime

from app.terminology.loinc_catalog import (
    lookup_loinc,
    match_terminology,
    validate_ucum,
    infer_missing_unit_candidates,
)
from app.security.phi_scrubber import TokenVault


def parse_hl7_datetime(hl7_ts: str) -> str:
    """Convert HL7 TS format (YYYYMMDD[HHMMSS]) to FHIR ISO-8601 (YYYY-MM-DDTHH:MM:SSZ)."""
    if not hl7_ts:
        return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    clean = re.sub(r"[^\d]", "", hl7_ts)
    try:
        if len(clean) >= 14:
            dt = datetime.strptime(clean[:14], "%Y%m%d%H%M%S")
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        elif len(clean) >= 12:
            dt = datetime.strptime(clean[:12], "%Y%m%d%H%M")
            return dt.strftime("%Y-%m-%dT%H:%M:00Z")
        elif len(clean) >= 8:
            dt = datetime.strptime(clean[:8], "%Y%m%d")
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return hl7_ts


def parse_hl7_date(hl7_dt: str) -> str:
    """Convert HL7 DT format (YYYYMMDD) to FHIR Date (YYYY-MM-DD)."""
    if not hl7_dt:
        return ""
    clean = re.sub(r"[^\d]", "", hl7_dt)
    if len(clean) >= 8:
        return f"{clean[:4]}-{clean[4:6]}-{clean[6:8]}"
    return hl7_dt


def map_gender(hl7_gender: str) -> str:
    """Map HL7 Administrative Sex to FHIR administrative-gender value set."""
    g = hl7_gender.upper().strip() if hl7_gender else ""
    if g == "M":
        return "male"
    elif g == "F":
        return "female"
    elif g == "O":
        return "other"
    return "unknown"


def map_encounter_class(pv1_patient_class: str) -> dict[str, str]:
    """Map PV1-2 patient class to FHIR ActEncounterCode."""
    pc = pv1_patient_class.upper().strip() if pv1_patient_class else ""
    if pc == "I":
        return {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "IMP", "display": "inpatient encounter"}
    elif pc == "O":
        return {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB", "display": "ambulatory"}
    elif pc == "E":
        return {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "EMER", "display": "emergency"}
    elif pc == "P":
        return {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "PRENC", "display": "pre-admission"}
    return {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB", "display": "ambulatory"}


def map_observation_interpretation(flag: str) -> list[dict[str, Any]]:
    """Map HL7 OBX-8 abnormal flag to FHIR ObservationInterpretation."""
    if not flag:
        return []
    f = flag.upper().strip()
    mapping = {
        "H": {"code": "H", "display": "High"},
        "HH": {"code": "HH", "display": "Critically High"},
        "L": {"code": "L", "display": "Low"},
        "LL": {"code": "LL", "display": "Critically Low"},
        "N": {"code": "N", "display": "Normal"},
        "A": {"code": "A", "display": "Abnormal"},
        "AA": {"code": "AA", "display": "Critically Abnormal"},
    }
    if f in mapping:
        entry = mapping[f]
        return [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                "code": entry["code"],
                "display": entry["display"],
            }],
            "text": entry["display"],
        }]
    return []


class SemanticMapper:
    """
    Orchestrates the conversion of HL7 v2 messages into FHIR R4 resources.
    Employs deterministic mappings for base structures and semantic grounding for observations.
    """

    def __init__(self):
        self.patient_id = f"pat-{uuid.uuid4().hex[:8]}"
        self.patient_urn = f"urn:uuid:{self.patient_id}"
        self.encounter_id = f"enc-{uuid.uuid4().hex[:8]}"
        self.encounter_urn = f"urn:uuid:{self.encounter_id}"
        self.ambiguities: list[dict[str, Any]] = []
        self.lineage: list[dict[str, Any]] = []
        self.confidence_counts = {"high": 0, "medium": 0, "low": 0}

    def _record_confidence(self, level: str, count: int = 1):
        self.confidence_counts[level] = self.confidence_counts.get(level, 0) + count

    def map_patient(self, pid_seg: dict[str, Any], nk1_segs: list[dict[str, Any]]) -> dict[str, Any]:
        """Construct FHIR R4 Patient resource from PID and NK1 segments."""
        fields = {f["field_index"]: f for f in pid_seg.get("fields", [])}

        patient: dict[str, Any] = {
            "resourceType": "Patient",
            "id": self.patient_id,
            "meta": {
                "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
            },
        }

        # Identifier (PID-3)
        if 3 in fields and fields[3]["raw_value"]:
            id_field = fields[3]
            mrn_val = id_field["raw_value"]
            assigning_auth = "urn:oid:hospital-mrn"
            if id_field["repetitions"] and id_field["repetitions"][0]["components"]:
                comps = id_field["repetitions"][0]["components"]
                mrn_val = comps[0]["value"]
                if len(comps) >= 4 and comps[3]["value"]:
                    assigning_auth = f"urn:oid:{comps[3]['value'].lower()}"

            patient["identifier"] = [
                {
                    "use": "usual",
                    "type": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                            "code": "MR",
                            "display": "Medical Record Number",
                        }]
                    },
                    "system": assigning_auth,
                    "value": mrn_val,
                }
            ]
            self.lineage.append({"fhir_path": "Patient.identifier[0]", "hl7_source": "PID-3", "confidence": "high"})
            self._record_confidence("high")

        # Name (PID-5)
        if 5 in fields and fields[5]["raw_value"]:
            name_field = fields[5]
            family = ""
            given = []
            if name_field["repetitions"] and name_field["repetitions"][0]["components"]:
                comps = name_field["repetitions"][0]["components"]
                if len(comps) >= 1:
                    family = comps[0]["value"]
                if len(comps) >= 2 and comps[1]["value"]:
                    given.append(comps[1]["value"])
                if len(comps) >= 3 and comps[2]["value"]:
                    given.append(comps[2]["value"])

            patient["name"] = [{
                "use": "official",
                "family": family,
                "given": given,
                "text": f"{' '.join(given)} {family}".strip(),
            }]
            self.lineage.append({"fhir_path": "Patient.name[0]", "hl7_source": "PID-5", "confidence": "high"})
            self._record_confidence("high")

        # Birth Date (PID-7)
        if 7 in fields and fields[7]["raw_value"]:
            patient["birthDate"] = parse_hl7_date(fields[7]["raw_value"])
            self.lineage.append({"fhir_path": "Patient.birthDate", "hl7_source": "PID-7", "confidence": "high"})
            self._record_confidence("high")

        # Gender (PID-8)
        if 8 in fields and fields[8]["raw_value"]:
            patient["gender"] = map_gender(fields[8]["raw_value"])
            self.lineage.append({"fhir_path": "Patient.gender", "hl7_source": "PID-8", "confidence": "high"})
            self._record_confidence("high")

        # Address (PID-11)
        if 11 in fields and fields[11]["raw_value"]:
            addr_field = fields[11]
            line, city, state, postal_code, country = "", "", "", "", "USA"
            if addr_field["repetitions"] and addr_field["repetitions"][0]["components"]:
                comps = addr_field["repetitions"][0]["components"]
                if len(comps) >= 1: line = comps[0]["value"]
                if len(comps) >= 3: city = comps[2]["value"]
                if len(comps) >= 4: state = comps[3]["value"]
                if len(comps) >= 5: postal_code = comps[4]["value"]
                if len(comps) >= 6: country = comps[5]["value"]

            patient["address"] = [{
                "use": "home",
                "line": [line] if line else [],
                "city": city,
                "state": state,
                "postalCode": postal_code,
                "country": country,
            }]
            self.lineage.append({"fhir_path": "Patient.address[0]", "hl7_source": "PID-11", "confidence": "high"})
            self._record_confidence("high")

        # Telecom (PID-13)
        if 13 in fields and fields[13]["raw_value"]:
            patient["telecom"] = [{
                "system": "phone",
                "value": fields[13]["raw_value"],
                "use": "home",
            }]
            self.lineage.append({"fhir_path": "Patient.telecom[0]", "hl7_source": "PID-13", "confidence": "high"})
            self._record_confidence("high")

        # US Core Race Extension (PID-10)
        extensions: list[dict[str, Any]] = []
        if 10 in fields and fields[10]["raw_value"]:
            race_raw = fields[10]["raw_value"]
            code, text = "2106-3", "White"
            if "^" in race_raw:
                parts = race_raw.split("^")
                code = parts[0]
                text = parts[1] if len(parts) > 1 else text
            extensions.append({
                "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
                "extension": [
                    {"url": "ombCategory", "valueCoding": {"system": "urn:oid:2.16.840.1.113883.6.238", "code": code, "display": text}},
                    {"url": "text", "valueString": text},
                ],
            })
            self.lineage.append({"fhir_path": "Patient.extension[us-core-race]", "hl7_source": "PID-10", "confidence": "high"})
            self._record_confidence("high")

        # US Core Ethnicity Extension (PID-22)
        if 22 in fields and fields[22]["raw_value"]:
            eth_raw = fields[22]["raw_value"]
            code, text = "2186-5", "Not Hispanic or Latino"
            if "^" in eth_raw:
                parts = eth_raw.split("^")
                code = parts[0]
                text = parts[1] if len(parts) > 1 else text
            extensions.append({
                "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
                "extension": [
                    {"url": "ombCategory", "valueCoding": {"system": "urn:oid:2.16.840.1.113883.6.238", "code": code, "display": text}},
                    {"url": "text", "valueString": text},
                ],
            })
            self.lineage.append({"fhir_path": "Patient.extension[us-core-ethnicity]", "hl7_source": "PID-22", "confidence": "high"})
            self._record_confidence("high")

        if extensions:
            patient["extension"] = extensions

        # Next of Kin / Contact (NK1)
        if nk1_segs:
            contacts = []
            for nk in nk1_segs:
                nk_fields = {f["field_index"]: f for f in nk.get("fields", [])}
                contact_entry: dict[str, Any] = {}
                if 2 in nk_fields and nk_fields[2]["raw_value"]:
                    nk_name = nk_fields[2]["raw_value"].split("^")
                    contact_entry["name"] = {
                        "family": nk_name[0] if len(nk_name) > 0 else "",
                        "given": [nk_name[1]] if len(nk_name) > 1 else [],
                    }
                if 3 in nk_fields and nk_fields[3]["raw_value"]:
                    rel_parts = nk_fields[3]["raw_value"].split("^")
                    contact_entry["relationship"] = [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
                            "code": rel_parts[0],
                            "display": rel_parts[1] if len(rel_parts) > 1 else "Contact",
                        }]
                    }]
                if 5 in nk_fields and nk_fields[5]["raw_value"]:
                    contact_entry["telecom"] = [{
                        "system": "phone",
                        "value": nk_fields[5]["raw_value"],
                    }]
                if contact_entry:
                    contacts.append(contact_entry)
            if contacts:
                patient["contact"] = contacts
                self.lineage.append({"fhir_path": "Patient.contact", "hl7_source": "NK1", "confidence": "high"})
                self._record_confidence("high")

        return patient

    def map_encounter(self, pv1_seg: dict[str, Any], ztr_seg: dict[str, Any] | None) -> dict[str, Any]:
        """Construct FHIR R4 Encounter resource from PV1 and optional ZTR segment."""
        fields = {f["field_index"]: f for f in pv1_seg.get("fields", [])}

        patient_class = fields.get(2, {}).get("raw_value", "I")
        encounter_class = map_encounter_class(patient_class)

        encounter: dict[str, Any] = {
            "resourceType": "Encounter",
            "id": self.encounter_id,
            "status": "in-progress",
            "class": encounter_class,
            "subject": {"reference": self.patient_urn},
        }

        # Assigned Location (PV1-3)
        if 3 in fields and fields[3]["raw_value"]:
            loc_str = fields[3]["raw_value"]
            encounter["location"] = [{
                "location": {"display": loc_str.replace("^", " / ")},
                "status": "active",
            }]
            self.lineage.append({"fhir_path": "Encounter.location[0]", "hl7_source": "PV1-3", "confidence": "high"})
            self._record_confidence("high")

        # Attending Practitioner (PV1-7)
        if 7 in fields and fields[7]["raw_value"]:
            doc_parts = fields[7]["raw_value"].split("^")
            npi = doc_parts[0] if len(doc_parts) > 0 else ""
            family = doc_parts[1] if len(doc_parts) > 1 else ""
            given = doc_parts[2] if len(doc_parts) > 2 else ""

            encounter["participant"] = [{
                "type": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                        "code": "ATND",
                        "display": "attender",
                    }]
                }],
                "individual": {
                    "identifier": {"system": "http://hl7.org/fhir/sid/us-npi", "value": npi},
                    "display": f"Dr. {given} {family}".strip(),
                },
            }]
            self.lineage.append({"fhir_path": "Encounter.participant[0]", "hl7_source": "PV1-7", "confidence": "high"})
            self._record_confidence("high")

        # Period (PV1-44 start, PV1-45 end)
        period: dict[str, str] = {}
        if 44 in fields and fields[44]["raw_value"]:
            period["start"] = parse_hl7_datetime(fields[44]["raw_value"])
        if 45 in fields and fields[45]["raw_value"]:
            period["end"] = parse_hl7_datetime(fields[45]["raw_value"])
            encounter["status"] = "finished"

        if period:
            encounter["period"] = period
            self.lineage.append({"fhir_path": "Encounter.period", "hl7_source": "PV1-44 / PV1-45", "confidence": "high"})
            self._record_confidence("high")

        # Custom ZTR segment mapped as Encounter extension
        if ztr_seg:
            ztr_fields = {f["field_index"]: f for f in ztr_seg.get("fields", [])}
            transport_mode = ztr_fields.get(2, {}).get("raw_value", "Unknown Transport")
            isolation_status = ztr_fields.get(3, {}).get("raw_value", "")

            exts = [
                {"url": "transportMode", "valueString": transport_mode},
            ]
            if isolation_status:
                exts.append({"url": "isolationStatus", "valueString": isolation_status})

            encounter["extension"] = [{
                "url": "http://example.org/fhir/StructureDefinition/encounter-patient-transport",
                "extension": exts,
            }]
            self.ambiguities.append({
                "id": f"amb-ztr-{uuid.uuid4().hex[:6]}",
                "type": "CUSTOM_Z_SEGMENT",
                "severity": "info",
                "field_location": "ZTR",
                "title": "Proprietary Transport Segment (ZTR) Mapped",
                "message": f"Successfully mapped hospital transport mode '{transport_mode}' as an Encounter extension.",
                "target_resource_id": self.encounter_id,
            })
            self.lineage.append({"fhir_path": "Encounter.extension[encounter-patient-transport]", "hl7_source": "ZTR", "confidence": "medium"})
            self._record_confidence("medium")

        return encounter

    def map_observations_and_reports(
        self,
        obr_segs: list[dict[str, Any]],
        obx_segs: list[dict[str, Any]],
        nte_segs: list[dict[str, Any]],
        zds_seg: dict[str, Any] | None,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Convert OBR and OBX segments into FHIR DiagnosticReport and Observation resources."""
        observations: list[dict[str, Any]] = []
        reports: list[dict[str, Any]] = []
        obs_urn_map: list[str] = []

        # Map each OBX to Observation
        for idx, obx in enumerate(obx_segs, start=1):
            fields = {f["field_index"]: f for f in obx.get("fields", [])}
            obs_id = f"obs-{uuid.uuid4().hex[:8]}"
            obs_urn = f"urn:uuid:{obs_id}"
            obs_urn_map.append(obs_urn)

            obs_code_raw = fields.get(3, {}).get("raw_value", f"UNKNOWN_{idx}")
            value_type = fields.get(2, {}).get("raw_value", "ST")
            raw_val = fields.get(5, {}).get("raw_value", "")
            raw_units = fields.get(6, {}).get("raw_value", "")
            raw_ref_range = fields.get(7, {}).get("raw_value", "")
            raw_flag = fields.get(8, {}).get("raw_value", "")
            status_code = fields.get(11, {}).get("raw_value", "F")

            # Parse Code and ground with LOINC catalog
            parsed_code = ""
            display_name = ""
            system = "http://loinc.org"

            if "^" in obs_code_raw:
                parts = obs_code_raw.split("^")
                parsed_code = parts[0].strip()
                display_name = parts[1].strip() if len(parts) > 1 else ""
                if len(parts) > 2 and parts[2].strip() in ["LN", "LOINC"]:
                    system = "http://loinc.org"
            else:
                parsed_code = obs_code_raw.strip()
                display_name = obs_code_raw.strip()

            # Terminology Grounding
            loinc_entry = lookup_loinc(parsed_code)
            is_grounded = loinc_entry is not None

            # If not grounded or local code (e.g. BP_LOCAL), attempt matching
            matched_candidates = []
            if not is_grounded:
                matched_candidates = match_terminology(display_name or parsed_code)
                if matched_candidates:
                    top = matched_candidates[0]
                    self.ambiguities.append({
                        "id": f"amb-term-{obs_id}",
                        "type": "LOCAL_TERMINOLOGY",
                        "severity": "warning",
                        "field_location": f"OBX-3 (Index {idx})",
                        "title": f"Local Code '{parsed_code}' Grounded to LOINC",
                        "message": f"Local test '{display_name}' mapped to LOINC {top['code']} ({top['display']}) with {int(top['confidence']*100)}% confidence.",
                        "suggested_options": [f"{c['code']} - {c['display']}" for c in matched_candidates],
                        "default_choice": f"{top['code']} - {top['display']}",
                        "target_resource_id": obs_id,
                    })
                    parsed_code = top["code"]
                    display_name = top["display"]
                    self._record_confidence("medium")
                else:
                    self._record_confidence("low")
            else:
                display_name = loinc_entry["display"]
                self._record_confidence("high")

            # Determine category: Vital Signs vs Laboratory
            category_code = "laboratory"
            category_display = "Laboratory"
            if any(term in display_name.lower() for term in ["pressure", "temperature", "heart rate", "pulse", "weight", "height", "saturation", "bmi"]):
                category_code = "vital-signs"
                category_display = "Vital Signs"

            observation: dict[str, Any] = {
                "resourceType": "Observation",
                "id": obs_id,
                "status": "final" if status_code == "F" else "preliminary",
                "category": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": category_code,
                        "display": category_display,
                    }]
                }],
                "code": {
                    "coding": [
                        {
                            "system": system,
                            "code": parsed_code,
                            "display": display_name,
                        }
                    ],
                    "text": display_name,
                },
                "subject": {"reference": self.patient_urn},
                "encounter": {"reference": self.encounter_urn},
            }

            # Handle Compound Blood Pressure (e.g. 138/88)
            if "/" in raw_val and category_code == "vital-signs" and ("blood pressure" in display_name.lower() or "bp" in display_name.lower()):
                bp_parts = raw_val.split("/")
                try:
                    systolic_val = float(bp_parts[0].strip())
                    diastolic_val = float(bp_parts[1].strip())
                    observation["code"] = {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "85354-9",
                            "display": "Blood pressure panel with all children optional",
                        }],
                        "text": "Blood pressure panel",
                    }
                    observation["component"] = [
                        {
                            "code": {
                                "coding": [{
                                    "system": "http://loinc.org",
                                    "code": "8480-6",
                                    "display": "Systolic blood pressure",
                                }],
                                "text": "Systolic blood pressure",
                            },
                            "valueQuantity": {
                                "value": systolic_val,
                                "unit": "mm[Hg]",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]",
                            },
                        },
                        {
                            "code": {
                                "coding": [{
                                    "system": "http://loinc.org",
                                    "code": "8462-4",
                                    "display": "Diastolic blood pressure",
                                }],
                                "text": "Diastolic blood pressure",
                            },
                            "valueQuantity": {
                                "value": diastolic_val,
                                "unit": "mm[Hg]",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]",
                            },
                        },
                    ]
                    self.ambiguities.append({
                        "id": f"amb-bp-{obs_id}",
                        "type": "COMPOUND_VALUE",
                        "severity": "info",
                        "field_location": f"OBX-5 (Index {idx})",
                        "title": "Compound Blood Pressure Decomposed",
                        "message": f"String '{raw_val}' parsed into standard FHIR systolic ({systolic_val} mm[Hg]) and diastolic ({diastolic_val} mm[Hg]) components.",
                        "target_resource_id": obs_id,
                    })
                    self.lineage.append({"fhir_path": f"Observation[{obs_id}].component", "hl7_source": f"OBX-5 (Index {idx})", "confidence": "high"})
                    self._record_confidence("high", 2)
                    observations.append(observation)
                    continue
                except Exception:
                    pass

            # Handle Missing UCUM Unit
            unit_val = raw_units.strip()
            if not unit_val and value_type == "NM":
                candidates = infer_missing_unit_candidates(display_name)
                default_unit = candidates[0] if candidates else "1"
                unit_val = default_unit
                self.ambiguities.append({
                    "id": f"amb-unit-{obs_id}",
                    "type": "MISSING_UNIT",
                    "severity": "action_required",
                    "field_location": f"OBX-6 (Index {idx})",
                    "title": f"Missing Unit for {display_name}",
                    "message": f"Observation has value '{raw_val}' but OBX-6 unit is empty. Clinical informaticist verification required.",
                    "suggested_options": candidates,
                    "default_choice": default_unit,
                    "target_resource_id": obs_id,
                    "target_property_path": "valueQuantity.unit",
                    "is_resolved": False,
                })
                self._record_confidence("low")
            elif unit_val and validate_ucum(unit_val):
                self._record_confidence("high")

            # Value Mapping (Quantity vs String)
            if value_type == "NM":
                try:
                    num_val = float(raw_val)
                    observation["valueQuantity"] = {
                        "value": num_val,
                        "unit": unit_val,
                        "system": "http://unitsofmeasure.org",
                        "code": unit_val,
                    }
                except ValueError:
                    observation["valueString"] = raw_val
            else:
                observation["valueString"] = raw_val

            # Interpretation / Abnormal Flags (OBX-8)
            interp = map_observation_interpretation(raw_flag)
            if interp:
                observation["interpretation"] = interp

            # Reference Range (OBX-7)
            if raw_ref_range:
                observation["referenceRange"] = [{
                    "text": raw_ref_range,
                }]

            self.lineage.append({
                "fhir_path": f"Observation[{obs_id}]",
                "hl7_source": f"OBX (Index {idx})",
                "confidence": "high" if is_grounded and unit_val else "medium",
            })
            observations.append(observation)

        # Map OBR to DiagnosticReport
        if obr_segs:
            for obr in obr_segs:
                fields = {f["field_index"]: f for f in obr.get("fields", [])}
                rpt_id = f"rpt-{uuid.uuid4().hex[:8]}"

                service_raw = fields.get(4, {}).get("raw_value", "Diagnostic Report")
                service_code, service_display = "24323-8", "Comprehensive Metabolic Panel"
                if "^" in service_raw:
                    s_parts = service_raw.split("^")
                    service_code = s_parts[0]
                    service_display = s_parts[1] if len(s_parts) > 1 else service_display

                # Attach free-text notes from NTE segments
                notes_text = []
                for nte in nte_segs:
                    nte_fields = {f["field_index"]: f for f in nte.get("fields", [])}
                    comment = nte_fields.get(3, {}).get("raw_value", "")
                    if comment:
                        notes_text.append(comment)

                report: dict[str, Any] = {
                    "resourceType": "DiagnosticReport",
                    "id": rpt_id,
                    "status": "final",
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": service_code,
                            "display": service_display,
                        }],
                        "text": service_display,
                    },
                    "subject": {"reference": self.patient_urn},
                    "encounter": {"reference": self.encounter_urn},
                    "result": [{"reference": urn} for urn in obs_urn_map],
                }

                if notes_text:
                    report["conclusion"] = " \n".join(notes_text)

                # Custom ZDS Segment mapped to DiagnosticReport imaging study extension
                if zds_seg:
                    zds_fields = {f["field_index"]: f for f in zds_seg.get("fields", [])}
                    study_uid = zds_fields.get(2, {}).get("raw_value", "1.2.840.unknown")
                    modality = zds_fields.get(3, {}).get("raw_value", "CR")
                    room = zds_fields.get(5, {}).get("raw_value", "")

                    report["extension"] = [{
                        "url": "http://example.org/fhir/StructureDefinition/dicom-study-meta",
                        "extension": [
                            {"url": "studyInstanceUid", "valueString": study_uid},
                            {"url": "modality", "valueCode": modality},
                            {"url": "imagingRoom", "valueString": room},
                        ],
                    }]
                    self.ambiguities.append({
                        "id": f"amb-zds-{uuid.uuid4().hex[:6]}",
                        "type": "CUSTOM_Z_SEGMENT",
                        "severity": "info",
                        "field_location": "ZDS",
                        "title": "Proprietary DICOM Study Segment (ZDS) Mapped",
                        "message": f"Hospital DICOM Study UID '{study_uid}' and Modality '{modality}' mapped to DiagnosticReport extension.",
                        "target_resource_id": rpt_id,
                    })
                    self._record_confidence("medium")

                self.lineage.append({"fhir_path": f"DiagnosticReport[{rpt_id}]", "hl7_source": "OBR", "confidence": "high"})
                self._record_confidence("high")
                reports.append(report)

        return observations, reports

    def map_conditions_and_coverage(
        self, dg1_segs: list[dict[str, Any]], in1_segs: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Convert DG1 to Condition and IN1 to Coverage resources."""
        conditions: list[dict[str, Any]] = []
        coverages: list[dict[str, Any]] = []

        # DG1 -> Condition
        for dg in dg1_segs:
            fields = {f["field_index"]: f for f in dg.get("fields", [])}
            diag_raw = fields.get(3, {}).get("raw_value", "R69^Illness, unspecified")
            code, display = "J18.9", "Pneumonia, unspecified organism"
            if "^" in diag_raw:
                p = diag_raw.split("^")
                code = p[0]
                display = p[1] if len(p) > 1 else display

            cond_id = f"cond-{uuid.uuid4().hex[:8]}"
            condition = {
                "resourceType": "Condition",
                "id": cond_id,
                "meta": {
                    "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"],
                },
                "category": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                        "code": "encounter-diagnosis",
                        "display": "Encounter Diagnosis",
                    }]
                }],
                "clinicalStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                    }]
                },
                "verificationStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "confirmed",
                    }]
                },
                "code": {
                    "coding": [{
                        "system": "http://hl7.org/fhir/sid/icd-10-cm",
                        "code": code,
                        "display": display,
                    }],
                    "text": display,
                },
                "subject": {"reference": self.patient_urn},
                "encounter": {"reference": self.encounter_urn},
            }
            self.lineage.append({"fhir_path": f"Condition[{cond_id}]", "hl7_source": "DG1-3", "confidence": "high"})
            self._record_confidence("high")
            conditions.append(condition)

        # IN1 -> Coverage
        for in1 in in1_segs:
            fields = {f["field_index"]: f for f in in1.get("fields", [])}
            plan_name = fields.get(4, {}).get("raw_value", "Health Insurance Plan")
            policy_num = fields.get(36, {}).get("raw_value", "POL-DEFAULT")

            cov_id = f"cov-{uuid.uuid4().hex[:8]}"
            coverage = {
                "resourceType": "Coverage",
                "id": cov_id,
                "status": "active",
                "beneficiary": {"reference": self.patient_urn},
                "payor": [{"display": plan_name}],
                "subscriberId": policy_num,
            }
            self.lineage.append({"fhir_path": f"Coverage[{cov_id}]", "hl7_source": "IN1", "confidence": "high"})
            self._record_confidence("high")
            coverages.append(coverage)

        return conditions, coverages

    def build_bundle(self, parsed_message: dict[str, Any], vault: TokenVault) -> dict[str, Any]:
        """Assemble all generated FHIR resources into a standardized FHIR R4 Bundle."""
        segments = parsed_message.get("segments", [])
        msh_seg = next((s for s in segments if s["segment_id"] == "MSH"), None)
        pid_seg = next((s for s in segments if s["segment_id"] == "PID"), None)
        pv1_seg = next((s for s in segments if s["segment_id"] == "PV1"), None)
        nk1_segs = [s for s in segments if s["segment_id"] == "NK1"]
        obr_segs = [s for s in segments if s["segment_id"] == "OBR"]
        obx_segs = [s for s in segments if s["segment_id"] == "OBX"]
        nte_segs = [s for s in segments if s["segment_id"] == "NTE"]
        dg1_segs = [s for s in segments if s["segment_id"] == "DG1"]
        in1_segs = [s for s in segments if s["segment_id"] == "IN1"]
        zds_seg = next((s for s in segments if s["segment_id"] == "ZDS"), None)
        ztr_seg = next((s for s in segments if s["segment_id"] == "ZTR"), None)

        resources: list[dict[str, Any]] = []

        # 1. Patient
        if pid_seg:
            patient = self.map_patient(pid_seg, nk1_segs)
            resources.append(patient)

        # 2. Encounter
        if pv1_seg:
            encounter = self.map_encounter(pv1_seg, ztr_seg)
            resources.append(encounter)

        # 3. Observations and DiagnosticReports
        obs_list, rpt_list = self.map_observations_and_reports(obr_segs, obx_segs, nte_segs, zds_seg)
        resources.extend(obs_list)
        resources.extend(rpt_list)

        # 4. Conditions and Coverage
        cond_list, cov_list = self.map_conditions_and_coverage(dg1_segs, in1_segs)
        resources.extend(cond_list)
        resources.extend(cov_list)

        # Timestamp from MSH-7
        msh_ts = ""
        if msh_seg:
            msh_fields = {f["field_index"]: f for f in msh_seg.get("fields", [])}
            msh_ts = parse_hl7_datetime(msh_fields.get(7, {}).get("raw_value", ""))

        bundle_id = f"bundle-{uuid.uuid4().hex[:8]}"
        bundle: dict[str, Any] = {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "transaction",
            "timestamp": msh_ts or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "entry": [
                {
                    "fullUrl": f"urn:uuid:{r['id']}",
                    "resource": r,
                    "request": {
                        "method": "POST",
                        "url": r["resourceType"],
                    },
                }
                for r in resources
            ],
        }

        # Calculate confidence percentages
        total_checks = sum(self.confidence_counts.values()) or 1
        confidence_percent = round(
            ((self.confidence_counts["high"] * 1.0 + self.confidence_counts["medium"] * 0.75 + self.confidence_counts["low"] * 0.4) / total_checks) * 100
        )

        # Calculate per-resource confidence details for visual UI cards
        resource_confidences: dict[str, Any] = {}
        for r in resources:
            rid = r["id"]
            r_ambs = [a for a in self.ambiguities if a.get("target_resource_id") == rid]
            has_action = any(a.get("severity") == "action_required" and not a.get("is_resolved") for a in r_ambs)
            has_warning = any(a.get("severity") == "warning" and not a.get("is_resolved") for a in r_ambs)

            if has_action:
                r_score = 65
                r_level = "low"
                r_reason = "Action Required (e.g. missing unit of measure)"
            elif has_warning:
                r_score = 80
                r_level = "medium"
                r_reason = "Needs Review (inferred terminology or Z-segment extension)"
            else:
                r_score = 98
                r_level = "high"
                r_reason = "High Confidence (deterministic standard mapping)"

            resource_confidences[rid] = {
                "resource_id": rid,
                "resource_type": r["resourceType"],
                "score": r_score,
                "level": r_level,
                "reason": r_reason,
                "ambiguity_ids": [a["id"] for a in r_ambs],
            }

        return {
            "bundle": bundle,
            "rehydrated_bundle": vault.rehydrate_data(bundle),
            "confidence_score": confidence_percent,
            "confidence_counts": self.confidence_counts,
            "resource_confidences": resource_confidences,
            "ambiguities": self.ambiguities,
            "lineage": self.lineage,
            "total_resources": len(resources),
            "resource_types": list(set(r["resourceType"] for r in resources)),
        }

