"""
Local Terminology Grounding Engine
Grounds laboratory observations and vital signs against standard LOINC codes and UCUM units,
preventing LLM hallucination and providing candidate ranking for ambiguous local terms.
"""

from dataclasses import dataclass
from typing import Any
import re


@dataclass
class LOINCEntry:
    code: str
    display: str
    category: str
    preferred_ucum_unit: str
    common_names: list[str]
    system: str = "http://loinc.org"


LOINC_DICTIONARY: dict[str, LOINCEntry] = {
    # Comprehensive Metabolic Panel & Common Chemistries
    "2345-7": LOINCEntry("2345-7", "Glucose [Mass/volume] in Serum or Plasma", "Laboratory", "mg/dL", ["glucose", "fasting glucose", "glu", "blood sugar"]),
    "2951-2": LOINCEntry("2951-2", "Sodium [Moles/volume] in Serum or Plasma", "Laboratory", "mmol/L", ["sodium", "na", "serum sodium"]),
    "2823-3": LOINCEntry("2823-3", "Potassium [Moles/volume] in Serum or Plasma", "Laboratory", "mmol/L", ["potassium", "k", "serum potassium"]),
    "2075-0": LOINCEntry("2075-0", "Chloride [Moles/volume] in Serum or Plasma", "Laboratory", "mmol/L", ["chloride", "cl"]),
    "2028-9": LOINCEntry("2028-9", "Carbon dioxide, total [Moles/volume] in Serum or Plasma", "Laboratory", "mmol/L", ["co2", "bicarbonate", "total co2"]),
    "3094-0": LOINCEntry("3094-0", "Blood Urea Nitrogen [Mass/volume] in Serum or Plasma", "Laboratory", "mg/dL", ["bun", "urea nitrogen"]),
    "2160-0": LOINCEntry("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", "Laboratory", "mg/dL", ["creatinine", "creat", "serum creatinine"]),
    "17861-6": LOINCEntry("17861-6", "Calcium [Mass/volume] in Serum or Plasma", "Laboratory", "mg/dL", ["calcium", "ca"]),
    "2885-2": LOINCEntry("2885-2", "Protein, total [Mass/volume] in Serum or Plasma", "Laboratory", "g/dL", ["total protein", "tp"]),
    "1751-7": LOINCEntry("1751-7", "Albumin [Mass/volume] in Serum or Plasma", "Laboratory", "g/dL", ["albumin", "alb"]),
    "1975-2": LOINCEntry("1975-2", "Bilirubin, total [Mass/volume] in Serum or Plasma", "Laboratory", "mg/dL", ["total bilirubin", "bili"]),
    "6768-6": LOINCEntry("6768-6", "Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma", "Laboratory", "U/L", ["alkaline phosphatase", "alk phos", "alp"]),
    "1742-6": LOINCEntry("1742-6", "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma", "Laboratory", "U/L", ["alt", "sgpt"]),
    "1920-8": LOINCEntry("1920-8", "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma", "Laboratory", "U/L", ["ast", "sgot"]),
    "24323-8": LOINCEntry("24323-8", "Comprehensive metabolic 1998 panel - Serum or Plasma", "Laboratory", "{panel}", ["cmp", "comprehensive metabolic panel"]),

    # Complete Blood Count (CBC)
    "6690-2": LOINCEntry("6690-2", "Leukocytes [#/volume] in Blood by Automated count", "Laboratory", "10*3/uL", ["wbc", "white blood count", "leukocytes"]),
    "789-8": LOINCEntry("789-8", "Erythrocytes [#/volume] in Blood by Automated count", "Laboratory", "10*6/uL", ["rbc", "red blood count", "erythrocytes"]),
    "718-7": LOINCEntry("718-7", "Hemoglobin [Mass/volume] in Blood", "Laboratory", "g/dL", ["hemoglobin", "hgb", "hb"]),
    "4544-3": LOINCEntry("4544-3", "Hematocrit [Volume Fraction] of Blood by Automated count", "Laboratory", "%", ["hematocrit", "hct"]),
    "777-3": LOINCEntry("777-3", "Platelets [#/volume] in Blood by Automated count", "Laboratory", "10*3/uL", ["platelets", "plt", "platelet count"]),
    "58410-2": LOINCEntry("58410-2", "Complete blood count (CBC) with automated differential panel", "Laboratory", "{panel}", ["cbc", "cbc with diff"]),

    # Vital Signs & Clinical Measurements
    "85354-9": LOINCEntry("85354-9", "Blood pressure panel with all children optional", "Vital Signs", "mm[Hg]", ["blood pressure", "bp", "blood pressure panel", "bp_local"]),
    "8480-6": LOINCEntry("8480-6", "Systolic blood pressure", "Vital Signs", "mm[Hg]", ["systolic", "systolic bp", "sbp"]),
    "8462-4": LOINCEntry("8462-4", "Diastolic blood pressure", "Vital Signs", "mm[Hg]", ["diastolic", "diastolic bp", "dbp"]),
    "8867-4": LOINCEntry("8867-4", "Heart rate", "Vital Signs", "/min", ["heart rate", "pulse", "hr", "bpm"]),
    "8310-5": LOINCEntry("8310-5", "Body temperature", "Vital Signs", "Cel", ["body temperature", "temp", "temperature"]),
    "29463-7": LOINCEntry("29463-7", "Body weight", "Vital Signs", "kg", ["body weight", "weight", "wt"]),
    "8302-2": LOINCEntry("8302-2", "Body height", "Vital Signs", "cm", ["body height", "height", "ht", "stature"]),
    "39156-5": LOINCEntry("39156-5", "Body mass index (BMI) [Ratio]", "Vital Signs", "kg/m2", ["bmi", "body mass index"]),
    "59408-5": LOINCEntry("59408-5", "Oxygen saturation in Arterial blood by Pulse oximetry", "Vital Signs", "%", ["pulse ox", "spo2", "o2 sat", "oxygen saturation"]),
    "9279-1": LOINCEntry("9279-1", "Respiratory rate", "Vital Signs", "/min", ["respiratory rate", "rr", "resp rate", "breaths per minute"]),

    # Radiology & Diagnostic Studies
    "18748-4": LOINCEntry("18748-4", "Diagnostic imaging report", "Radiology", "{report}", ["radiology report", "imaging report", "x-ray report"]),
    "71020": LOINCEntry("71020", "Radiologic examination, chest, 2 views", "Radiology", "{study}", ["chest x-ray", "cxr", "chest pa and lat"], system="http://www.ama-assn.org/go/cpt"),
}

# Standard UCUM units
STANDARD_UCUM_UNITS: dict[str, dict] = {
    "mg/dL": {"name": "milligram per deciliter", "category": "concentration"},
    "g/dL": {"name": "gram per deciliter", "category": "concentration"},
    "mmol/L": {"name": "millimole per liter", "category": "concentration"},
    "10*3/uL": {"name": "thousand per microliter", "category": "cell count"},
    "10*6/uL": {"name": "million per microliter", "category": "cell count"},
    "%": {"name": "percent", "category": "fraction"},
    "mm[Hg]": {"name": "millimeter of mercury", "category": "pressure"},
    "/min": {"name": "per minute", "category": "frequency"},
    "Cel": {"name": "degree Celsius", "category": "temperature"},
    "[degF]": {"name": "degree Fahrenheit", "category": "temperature"},
    "kg": {"name": "kilogram", "category": "mass"},
    "[lb_av]": {"name": "pound (avoirdupois)", "category": "mass"},
    "g": {"name": "gram", "category": "mass"},
    "cm": {"name": "centimeter", "category": "length"},
    "[in_i]": {"name": "inch", "category": "length"},
    "kg/m2": {"name": "kilogram per square meter", "category": "body mass index"},
}


def lookup_loinc(code: str) -> dict | None:
    """Check if a code exists in our grounded catalog."""
    clean_code = code.strip()
    if clean_code in LOINC_DICTIONARY:
        entry = LOINC_DICTIONARY[clean_code]
        return {
            "code": entry.code,
            "display": entry.display,
            "system": entry.system,
            "preferred_unit": entry.preferred_ucum_unit,
            "category": entry.category,
            "is_grounded": True,
        }
    return None


def match_terminology(query_text: str) -> list[dict]:
    """
    Search grounded catalog for matching LOINC codes using token overlap and similarity.
    Returns ranked candidates with confidence scores.
    """
    if not query_text:
        return []

    tokens = set(re.findall(r"\w+", query_text.lower()))
    matches: list[dict] = []

    for code, entry in LOINC_DICTIONARY.items():
        # Check direct code match
        if query_text.lower() == code.lower():
            return [{
                "code": entry.code,
                "display": entry.display,
                "system": entry.system,
                "preferred_unit": entry.preferred_ucum_unit,
                "confidence": 1.0,
                "reason": "Exact LOINC code match",
            }]

        # Check common name matches
        max_score = 0.0
        match_reason = ""

        for name in entry.common_names:
            if name == query_text.lower():
                max_score = 0.95
                match_reason = f"Exact synonym match: '{name}'"
                break
            name_tokens = set(re.findall(r"\w+", name))
            if tokens and name_tokens:
                intersection = tokens.intersection(name_tokens)
                if len(intersection) == len(tokens) and len(tokens) > 0:
                    score = 0.85
                    if score > max_score:
                        max_score = score
                        match_reason = f"Full token containment in '{name}'"
                elif intersection:
                    score = 0.5 + (0.35 * (len(intersection) / max(len(tokens), len(name_tokens))))
                    if score > max_score:
                        max_score = score
                        match_reason = f"Partial token match: {list(intersection)}"

        if max_score >= 0.5:
            matches.append({
                "code": entry.code,
                "display": entry.display,
                "system": entry.system,
                "preferred_unit": entry.preferred_ucum_unit,
                "confidence": round(max_score, 2),
                "reason": match_reason,
            })

    # Sort descending by confidence score
    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches[:4]


def validate_ucum(unit_str: str) -> bool:
    """Check if a given unit string is a recognized standard UCUM unit."""
    if not unit_str:
        return False
    clean = unit_str.strip()
    return clean in STANDARD_UCUM_UNITS


def infer_missing_unit_candidates(analyte_description: str) -> list[str]:
    """Suggest likely standard UCUM units when an observation is missing a unit."""
    query = analyte_description.lower()
    if any(w in query for w in ["weight", "wt", "body weight"]):
        return ["kg", "[lb_av]"]
    if any(w in query for w in ["height", "ht", "stature"]):
        return ["cm", "[in_i]"]
    if any(w in query for w in ["temperature", "temp"]):
        return ["Cel", "[degF]"]
    if any(w in query for w in ["blood pressure", "systolic", "diastolic"]):
        return ["mm[Hg]"]
    if any(w in query for w in ["heart rate", "pulse", "respiratory rate"]):
        return ["/min"]
    if any(w in query for w in ["glucose", "creatinine", "bun", "calcium"]):
        return ["mg/dL", "mmol/L"]
    return ["1", "{ratio}"]
