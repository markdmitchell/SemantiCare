from fastapi.testclient import TestClient
import sys
from app.main import app


def main():
    client = TestClient(app)


    # 1. Samples
    samples_res = client.get("/api/samples")
    assert samples_res.status_code == 200
    samples_data = samples_res.json()
    samples = samples_data.get("samples", [])
    print(f"Loaded {len(samples)} clinical scenarios.")

    for s in samples:
        title = s["title"]
        print(f"\n--- Testing Scenario: {title} ---")

        # 2. Parse
        p_res = client.post("/api/parse", json={"raw_hl7": s["raw"]})
        assert p_res.status_code == 200, f"Parse failed: {p_res.text}"
        p_data = p_res.json()
        assert p_data["success"] is True
        print(f"  Parsed {len(p_data['segments'])} segments. Message type: {p_data['metadata']['message_type']}")

        # 3. Map (with PHI scrubbing enabled)
        m_res = client.post("/api/map", json={"raw_hl7": s["raw"], "enable_phi_scrubbing": True})
        assert m_res.status_code == 200, f"Map failed: {m_res.text}"
        m_data = m_res.json()
        assert m_data["success"] is True
        bundle = m_data["fhir_bundle"]
        entries = bundle.get("entry", [])
        ambiguities = m_data.get("ambiguities", [])
        confidences = m_data.get("resource_confidences", [])
        print(f"  Mapped {len(entries)} resources. Confidence metrics: {len(confidences)}. Ambiguities: {len(ambiguities)}")

        # 4. Validate against US Core 3.1.1
        v_us_res = client.post("/api/validate", json={"bundle": bundle, "profile": "us-core-3.1.1"})
        assert v_us_res.status_code == 200, f"Validation failed: {v_us_res.text}"
        v_us = v_us_res.json()
        print(f"  [US Core 3.1.1] Conformance: {v_us['conformance_score']}% | Errors: {v_us['error_count']} | Warnings: {v_us['warning_count']} | Info: {v_us['info_count']}")

        # 5. Validate against HL7 Base R4
        v_base_res = client.post("/api/validate", json={"bundle": bundle, "profile": "hl7-base-r4"})
        assert v_base_res.status_code == 200, f"Validation failed: {v_base_res.text}"
        v_base = v_base_res.json()
        print(f"  [HL7 Base R4]   Conformance: {v_base['conformance_score']}% | Errors: {v_base['error_count']} | Warnings: {v_base['warning_count']} | Info: {v_base['info_count']}")

    # 6. Terminology fuzzy lookup
    print("\n--- Testing Terminology Engine ---")
    term_res = client.post("/api/terminology/lookup", json={"query": "potassium"})
    assert term_res.status_code == 200
    term_data = term_res.json()
    candidates = term_data.get("candidates", [])
    exact = term_data.get("exact_match")
    print(f"  Exact match found: {exact is not None}")
    print(f"  Candidate matches: {len(candidates)}")
    for c in candidates[:2]:
        print(f"    - LOINC {c['code']}: {c['display']} (Score: {c['confidence']})")
    assert len(candidates) > 0 or exact is not None

    # 7. Institutional Mapping Memory & Rulebase Test
    print("\n--- Testing Institutional Mapping Memory (v1.1) ---")
    rules_res = client.get("/api/rules")
    assert rules_res.status_code == 200
    rules_data = rules_res.json()
    print(f"  Existing Institutional Rules: {rules_data['count']}")

    # Add a learned rule for ICU_BED_3 missing unit
    new_rule_payload = {
        "facility": "ICU_BED_3",
        "rule_type": "MISSING_UNIT",
        "source_key": "29463-7",
        "target_value": "kg",
        "target_display": "Kilograms (kg)",
        "author": "Dr. Sarah Chen, Informatics Lead",
        "notes": "Calibrated bedside smart-scale unit confirmation.",
    }
    save_res = client.post("/api/rules", json=new_rule_payload)
    assert save_res.status_code == 200
    saved_rule = save_res.json()["rule"]
    print(f"  Saved New Rule: ID={saved_rule['id']} Facility={saved_rule['facility']} Source={saved_rule['source_key']} -> {saved_rule['target_value']}")

    # Re-map Sample 3 with this rule in place
    sample_3 = next(s for s in samples if s["id"] == "oru-r01-ambiguous-vitals")
    remap_res = client.post("/api/map", json={"raw_hl7": sample_3["raw"]})
    assert remap_res.status_code == 200
    remap_data = remap_res.json()
    auto_resolved = [a for a in remap_data["ambiguities"] if a.get("is_resolved") and a.get("type") == "MISSING_UNIT"]
    assert len(auto_resolved) >= 1
    print(f"  Verified Auto-Resolution: Ambiguity for {auto_resolved[0]['title']} auto-resolved by {auto_resolved[0]['resolved_by']}!")

    # Test FHIR ConceptMap export
    concept_map_res = client.get("/api/rules/export")
    assert concept_map_res.status_code == 200
    concept_map = concept_map_res.json()
    assert concept_map["resourceType"] == "ConceptMap"
    print(f"  Exported FHIR ConceptMap: Title='{concept_map['title']}' Groups={len(concept_map.get('group', []))}")

    # Delete rule cleanup
    del_res = client.delete(f"/api/rules/{saved_rule['id']}")
    assert del_res.status_code == 200
    print(f"  Deleted Test Rule: {del_res.json()['deleted_id']}")

    print("\n=== ALL INTEGRATION VERIFICATION CHECKS PASSED SUCCESSFULLY ===")


if __name__ == "__main__":
    main()

