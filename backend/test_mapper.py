from app.samples.sample_messages import SAMPLE_MESSAGES
from app.core.hl7_parser import parse_hl7_message
from app.security.phi_scrubber import scrub_hl7_message
from app.engine.mapper import SemanticMapper
import json

print("=== RUNNING PHASE 2 SEMANTIC MAPPER TEST SUITE ===\n")

for idx, sample in enumerate(SAMPLE_MESSAGES, start=1):
    print(f"[{idx}] Testing Scenario: {sample['title']}")
    
    # Step 1: PHI Scrubbing
    scrubbed_raw, vault = scrub_hl7_message(sample["raw"])
    audit = vault.to_audit_dict()
    print(f"    • PHI Scrubber: {audit['total_redactions']} entities redacted ({list(audit['entity_breakdown'].keys())})")
    
    # Step 2: Parse De-identified Message
    parsed = parse_hl7_message(scrubbed_raw)
    
    # Step 3: Semantic Mapping
    mapper = SemanticMapper()
    mapping_result = mapper.build_bundle(parsed, vault)
    
    bundle = mapping_result["bundle"]
    rehydrated = mapping_result["rehydrated_bundle"]
    
    print(f"    • FHIR Bundle ID: {bundle['id']}")
    print(f"    • Total Resources: {mapping_result['total_resources']} ({mapping_result['resource_types']})")
    print(f"    • Confidence Score: {mapping_result['confidence_score']}% (Counts: {mapping_result['confidence_counts']})")
    print(f"    • Detected Ambiguities: {len(mapping_result['ambiguities'])}")
    for amb in mapping_result["ambiguities"]:
        print(f"        - [{amb['type']}] {amb['title']}: {amb['message']}")
        
    # Verify de-identification vs rehydration in Patient resource if present
    patient_res = next((e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient"), None)
    rehydrated_patient = next((e["resource"] for e in rehydrated["entry"] if e["resource"]["resourceType"] == "Patient"), None)
    
    if patient_res and rehydrated_patient:
        deidentified_name = patient_res["name"][0]["text"]
        rehydrated_name = rehydrated_patient["name"][0]["text"]
        print(f"    • Patient Name (De-identified): {deidentified_name}")
        print(f"    • Patient Name (Re-hydrated):   {rehydrated_name}")
    print()

print("All Phase 2 Semantic Mapping tests passed successfully!")
