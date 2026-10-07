"""
High-Fidelity HL7 v2 Structural Parser
Extracts segments, fields, repetitions, components, and subcomponents
with full specification metadata annotation.
"""

from dataclasses import dataclass, field
from typing import Any
import re

from app.core.hl7_dictionary import get_segment_info, get_field_info, get_component_name


@dataclass
class HL7Delimiters:
    field: str = "|"
    component: str = "^"
    repetition: str = "~"
    escape: str = "\\"
    subcomponent: str = "&"


def unescape_hl7(text: str, delimiters: HL7Delimiters) -> str:
    """Unescape HL7 v2 escape sequences according to standard delimiters."""
    if not text or delimiters.escape not in text:
        return text
    
    esc = delimiters.escape
    # Perform literal string replacements without regex backslash escaping hazards
    return (
        text.replace(f"{esc}F{esc}", delimiters.field)
            .replace(f"{esc}S{esc}", delimiters.component)
            .replace(f"{esc}T{esc}", delimiters.subcomponent)
            .replace(f"{esc}R{esc}", delimiters.repetition)
            .replace(f"{esc}E{esc}", delimiters.escape)
            .replace(f"{esc}.br{esc}", "\n")
    )



def extract_delimiters(msh_line: str) -> HL7Delimiters:
    """Extract standard or custom delimiters directly from the MSH segment header."""
    if not msh_line.startswith("MSH") or len(msh_line) < 4:
        return HL7Delimiters()
    
    field_delim = msh_line[3]
    # In HL7, MSH-2 defines component, repetition, escape, subcomponent
    remaining = msh_line[4:]
    parts = remaining.split(field_delim)
    enc_chars = parts[0] if parts else "^~\\&"
    
    comp_delim = enc_chars[0] if len(enc_chars) > 0 else "^"
    rep_delim = enc_chars[1] if len(enc_chars) > 1 else "~"
    esc_delim = enc_chars[2] if len(enc_chars) > 2 else "\\"
    subcomp_delim = enc_chars[3] if len(enc_chars) > 3 else "&"
    
    return HL7Delimiters(
        field=field_delim,
        component=comp_delim,
        repetition=rep_delim,
        escape=esc_delim,
        subcomponent=subcomp_delim,
    )


def parse_field_content(raw_value: str, data_type: str, delimiters: HL7Delimiters) -> list[dict[str, Any]]:
    """Parse repetitions, components, and subcomponents from a raw field string."""
    if not raw_value:
        return []
    
    # Split by repetition character (~)
    raw_repetitions = raw_value.split(delimiters.repetition)
    parsed_repetitions: list[dict[str, Any]] = []
    
    for rep_idx, rep_str in enumerate(raw_repetitions, start=1):
        # Split by component character (^)
        components_raw = rep_str.split(delimiters.component)
        parsed_components: list[dict[str, Any]] = []
        
        for comp_idx, comp_str in enumerate(components_raw, start=1):
            if not comp_str:
                continue
                
            comp_name = get_component_name(data_type, comp_idx)
            subcomponents = comp_str.split(delimiters.subcomponent) if delimiters.subcomponent in comp_str else []
            clean_subcomponents = [unescape_hl7(sc, delimiters) for sc in subcomponents] if len(subcomponents) > 1 else []
            
            parsed_components.append({
                "component_index": comp_idx,
                "name": comp_name,
                "value": unescape_hl7(comp_str, delimiters),
                "subcomponents": clean_subcomponents,
            })
            
        parsed_repetitions.append({
            "repetition_index": rep_idx,
            "raw": rep_str,
            "components": parsed_components,
        })
        
    return parsed_repetitions


def parse_hl7_message(raw_message: str) -> dict[str, Any]:
    """
    Parse an HL7 v2 message string into an annotated, structural tree representation.
    Returns complete segment hierarchy, metadata dictionary annotations, and validation summary.
    """
    cleaned_input = raw_message.strip()
    if not cleaned_input:
        return {
            "is_valid": False,
            "error": "Empty message provided.",
            "segments": [],
            "metadata": {},
        }
    
    # Split into lines/segments (handling \r\n, \r, \n)
    lines = [line.strip() for line in re.split(r"\r\n|\r|\n", cleaned_input) if line.strip()]
    if not lines:
        return {
            "is_valid": False,
            "error": "No valid segments found in message.",
            "segments": [],
            "metadata": {},
        }
    
    first_line = lines[0]
    warnings: list[str] = []
    if not first_line.startswith("MSH"):
        warnings.append("First segment is not MSH (Message Header). Delimiters defaulted to standard HL7 '|' and '^~\\&'.")
        delimiters = HL7Delimiters()
    else:
        delimiters = extract_delimiters(first_line)
        
    parsed_segments: list[dict[str, Any]] = []
    segment_counts: dict[str, int] = {}
    
    for seg_idx, line in enumerate(lines):
        # Segment identifier is the first 3 characters
        if delimiters.field in line:
            seg_id = line.split(delimiters.field)[0]
        else:
            seg_id = line[:3]
            
        seg_id = seg_id.strip()
        segment_counts[seg_id] = segment_counts.get(seg_id, 0) + 1
        seg_meta = get_segment_info(seg_id)
        
        parsed_fields: list[dict[str, Any]] = []
        
        if seg_id == "MSH":
            # In HL7, MSH is uniquely indexed:
            # MSH-1 is the field separator character
            parsed_fields.append({
                "field_index": 1,
                "name": "Field Separator",
                "type": "ST",
                "description": "Delimiter separating fields in the message.",
                "raw_value": delimiters.field,
                "repetitions": [{"repetition_index": 1, "raw": delimiters.field, "components": [{"component_index": 1, "name": "Separator", "value": delimiters.field, "subcomponents": []}]}],
            })
            
            # MSH parts after MSH-1
            msh_remainder = line[4:] # past "MSH|"
            msh_tokens = msh_remainder.split(delimiters.field)
            
            for field_num, token in enumerate(msh_tokens, start=2):
                f_meta = get_field_info("MSH", field_num)
                field_reps = parse_field_content(token, f_meta.get("type", "ST"), delimiters)
                parsed_fields.append({
                    "field_index": field_num,
                    "name": f_meta.get("name", f"Field {field_num}"),
                    "type": f_meta.get("type", "ST"),
                    "description": f_meta.get("description", ""),
                    "raw_value": token,
                    "repetitions": field_reps,
                })
        else:
            tokens = line.split(delimiters.field)
            # tokens[0] is the segment ID
            field_tokens = tokens[1:]
            for field_num, token in enumerate(field_tokens, start=1):
                f_meta = get_field_info(seg_id, field_num)
                field_reps = parse_field_content(token, f_meta.get("type", "ST"), delimiters)
                parsed_fields.append({
                    "field_index": field_num,
                    "name": f_meta.get("name", f"Field {field_num}"),
                    "type": f_meta.get("type", "ST"),
                    "description": f_meta.get("description", ""),
                    "raw_value": token,
                    "repetitions": field_reps,
                })
                
        parsed_segments.append({
            "segment_id": seg_id,
            "unique_id": f"{seg_id}_{seg_idx}",
            "order_index": seg_idx + 1,
            "title": seg_meta.get("name", seg_id),
            "description": seg_meta.get("description", ""),
            "is_custom": seg_meta.get("is_custom", False),
            "raw": line,
            "fields": parsed_fields,
        })
        
    # Extract high-level message metadata from MSH if available
    metadata: dict[str, Any] = {
        "delimiters": {
            "field": delimiters.field,
            "component": delimiters.component,
            "repetition": delimiters.repetition,
            "escape": delimiters.escape,
            "subcomponent": delimiters.subcomponent,
        },
        "total_segments": len(parsed_segments),
        "segment_counts": segment_counts,
        "warnings": warnings,
    }
    
    msh_seg = next((s for s in parsed_segments if s["segment_id"] == "MSH"), None)
    if msh_seg:
        fields_by_num = {f["field_index"]: f["raw_value"] for f in msh_seg["fields"]}
        metadata["sending_application"] = fields_by_num.get(3, "")
        metadata["sending_facility"] = fields_by_num.get(4, "")
        metadata["receiving_application"] = fields_by_num.get(5, "")
        metadata["receiving_facility"] = fields_by_num.get(6, "")
        metadata["message_datetime"] = fields_by_num.get(7, "")
        metadata["message_type"] = fields_by_num.get(9, "")
        metadata["message_control_id"] = fields_by_num.get(10, "")
        metadata["processing_id"] = fields_by_num.get(11, "")
        metadata["hl7_version"] = fields_by_num.get(12, "")
        
    return {
        "is_valid": True,
        "metadata": metadata,
        "segments": parsed_segments,
    }
