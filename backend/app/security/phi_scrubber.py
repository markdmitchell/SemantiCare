"""
Zero-Trust Reversible PHI Scrubber and Token Vault
De-identifies Protected Health Information (PHI) in HL7 v2 messages before LLM processing,
and provides reversible re-hydration for local authorized viewing.
"""

from dataclasses import dataclass, field
from typing import Any
import re
import json


@dataclass
class PHIEntity:
    entity_type: str
    original_value: str
    token: str
    location: str
    confidence: float = 1.0


@dataclass
class TokenVault:
    token_to_original: dict[str, str] = field(default_factory=dict)
    original_to_token: dict[str, str] = field(default_factory=dict)
    detected_entities: list[PHIEntity] = field(default_factory=list)

    def register(self, original: str, entity_type: str, location: str) -> str:
        """Register an original PHI value and return a synthetic token."""
        clean_orig = original.strip()
        if not clean_orig:
            return original

        if clean_orig in self.original_to_token:
            return self.original_to_token[clean_orig]

        type_count = sum(1 for e in self.detected_entities if e.entity_type == entity_type) + 1
        token = f"[{entity_type}_{type_count}]"

        self.token_to_original[token] = clean_orig
        self.original_to_token[clean_orig] = token
        self.detected_entities.append(
            PHIEntity(
                entity_type=entity_type,
                original_value=clean_orig,
                token=token,
                location=location,
            )
        )
        return token

    def rehydrate_text(self, text: str) -> str:
        """Replace all synthetic tokens in a string with original PHI values."""
        if not text:
            return text
        result = text
        for token, original in self.token_to_original.items():
            result = result.replace(token, original)
        return result

    def rehydrate_data(self, data: Any) -> Any:
        """Recursively rehydrate any JSON/dict structure replacing tokens with original values."""
        if isinstance(data, str):
            return self.rehydrate_text(data)
        elif isinstance(data, list):
            return [self.rehydrate_data(item) for item in data]
        elif isinstance(data, dict):
            return {k: self.rehydrate_data(v) for k, v in data.items()}
        return data

    def to_audit_dict(self) -> dict[str, Any]:
        """Summary of detected entities for UI security audit drawer."""
        type_counts: dict[str, int] = {}
        for e in self.detected_entities:
            type_counts[e.entity_type] = type_counts.get(e.entity_type, 0) + 1

        return {
            "total_redactions": len(self.detected_entities),
            "entity_breakdown": type_counts,
            "entities": [
                {
                    "entity_type": e.entity_type,
                    "token": e.token,
                    "location": e.location,
                    "preview": f"{e.original_value[:2]}***" if len(e.original_value) > 2 else "***",
                }
                for e in self.detected_entities
            ],
        }


def scrub_hl7_message(raw_message: str) -> tuple[str, TokenVault]:
    """
    Scrub PHI from an HL7 v2 message using structural segment knowledge and heuristic patterns.
    Returns the sanitized message string and the TokenVault for reversible local re-hydration.
    """
    vault = TokenVault()
    lines = [line.strip() for line in re.split(r"\r\n|\r|\n", raw_message.strip()) if line.strip()]
    scrubbed_lines: list[str] = []

    for line_idx, line in enumerate(lines):
        if not line:
            continue

        parts = line.split("|")
        seg_id = parts[0].strip()

        if seg_id == "PID":
            # PID-3: Patient Identifier List (MRN)
            if len(parts) > 3 and parts[3].strip():
                orig_mrn = parts[3]
                # Check for component breakdown in MRN (e.g. MRN123^^^AUTHORITY)
                mrn_comps = orig_mrn.split("^")
                token_mrn = vault.register(mrn_comps[0], "PATIENT_MRN", f"PID-3.1 (Line {line_idx+1})")
                mrn_comps[0] = token_mrn
                parts[3] = "^".join(mrn_comps)

            # PID-5: Patient Legal Name (Family^Given^Middle^Suffix^Prefix)
            if len(parts) > 5 and parts[5].strip():
                name_parts = parts[5].split("^")
                if len(name_parts) > 0 and name_parts[0]:
                    name_parts[0] = vault.register(name_parts[0], "PATIENT_FAMILY_NAME", f"PID-5.1 (Line {line_idx+1})")
                if len(name_parts) > 1 and name_parts[1]:
                    name_parts[1] = vault.register(name_parts[1], "PATIENT_GIVEN_NAME", f"PID-5.2 (Line {line_idx+1})")
                if len(name_parts) > 2 and name_parts[2]:
                    name_parts[2] = vault.register(name_parts[2], "PATIENT_MIDDLE_NAME", f"PID-5.3 (Line {line_idx+1})")
                parts[5] = "^".join(name_parts)

            # PID-7: Date/Time of Birth
            if len(parts) > 7 and parts[7].strip():
                parts[7] = vault.register(parts[7], "PATIENT_DOB", f"PID-7 (Line {line_idx+1})")

            # PID-11: Patient Address (Street^Other^City^State^Zip^Country)
            if len(parts) > 11 and parts[11].strip():
                addr_parts = parts[11].split("^")
                if len(addr_parts) > 0 and addr_parts[0]:
                    addr_parts[0] = vault.register(addr_parts[0], "STREET_ADDRESS", f"PID-11.1 (Line {line_idx+1})")
                if len(addr_parts) > 4 and addr_parts[4]:
                    addr_parts[4] = vault.register(addr_parts[4], "POSTAL_CODE", f"PID-11.5 (Line {line_idx+1})")
                parts[11] = "^".join(addr_parts)

            # PID-13: Home Phone
            if len(parts) > 13 and parts[13].strip():
                parts[13] = vault.register(parts[13], "PHONE_NUMBER", f"PID-13 (Line {line_idx+1})")

            # PID-19: SSN
            if len(parts) > 19 and parts[19].strip():
                parts[19] = vault.register(parts[19], "SSN", f"PID-19 (Line {line_idx+1})")

        elif seg_id == "NK1":
            # NK1-2: Next of Kin Name
            if len(parts) > 2 and parts[2].strip():
                nk_parts = parts[2].split("^")
                for i in range(min(3, len(nk_parts))):
                    if nk_parts[i]:
                        nk_parts[i] = vault.register(nk_parts[i], "CONTACT_NAME", f"NK1-2.{i+1} (Line {line_idx+1})")
                parts[2] = "^".join(nk_parts)

            # NK1-4: Contact Address
            if len(parts) > 4 and parts[4].strip():
                nk_addr = parts[4].split("^")
                if len(nk_addr) > 0 and nk_addr[0]:
                    nk_addr[0] = vault.register(nk_addr[0], "STREET_ADDRESS", f"NK1-4.1 (Line {line_idx+1})")
                parts[4] = "^".join(nk_addr)

            # NK1-5: Contact Phone
            if len(parts) > 5 and parts[5].strip():
                parts[5] = vault.register(parts[5], "PHONE_NUMBER", f"NK1-5 (Line {line_idx+1})")

        elif seg_id == "PV1":
            # PV1-7: Attending Doctor (ID^Family^Given...)
            if len(parts) > 7 and parts[7].strip():
                doc_parts = parts[7].split("^")
                if len(doc_parts) > 0 and doc_parts[0]:
                    doc_parts[0] = vault.register(doc_parts[0], "PRACTITIONER_NPI", f"PV1-7.1 (Line {line_idx+1})")
                if len(doc_parts) > 1 and doc_parts[1]:
                    doc_parts[1] = vault.register(doc_parts[1], "PRACTITIONER_NAME", f"PV1-7.2 (Line {line_idx+1})")
                parts[7] = "^".join(doc_parts)

            # PV1-19: Visit Number
            if len(parts) > 19 and parts[19].strip():
                parts[19] = vault.register(parts[19], "VISIT_NUMBER", f"PV1-19 (Line {line_idx+1})")

        # Heuristic scan for SSN pattern (\d{3}-\d{2}-\d{4}) across any segment
        line_joined = "|".join(parts)
        ssn_matches = re.findall(r"\b\d{3}-\d{2}-\d{4}\b", line_joined)
        for ssn in ssn_matches:
            tok = vault.register(ssn, "SSN", f"Pattern Scan (Line {line_idx+1})")
            line_joined = line_joined.replace(ssn, tok)

        scrubbed_lines.append(line_joined)

    # Reconstruct sanitized message with standard carriage returns
    sanitized_message = "\r".join(scrubbed_lines)
    return sanitized_message, vault
