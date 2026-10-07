import httpx
import sys

def main():
    client = httpx.Client(base_url="http://127.0.0.1:8000")

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

    print("\n=== ALL INTEGRATION VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
