from app.samples.sample_messages import SAMPLE_MESSAGES
from app.core.hl7_parser import parse_hl7_message
from app.security.phi_scrubber import scrub_hl7_message
from app.engine.mapper import SemanticMapper
from app.validator.fhir_validator import validate_fhir_bundle
import json

print("=== RUNNING PHASE 4 FHIR VALIDATION TEST SUITE ===\n")

# 1. Test validation on our standard generated bundles
for idx, sample in enumerate(SAMPLE_MESSAGES, start=1):
    scrubbed_raw, vault = scrub_hl7_message(sample["raw"])
    parsed = parse_hl7_message(scrubbed_raw)
    mapper = SemanticMapper()
    mapping_result = mapper.build_bundle(parsed, vault)
    bundle = mapping_result["bundle"]
    
    val_result = validate_fhir_bundle(bundle, profile="us-core")
    print(f"[{idx}] {sample['title']}")
    print(f"    • Is Valid: {val_result['is_valid']}")
    print(f"    • Conformance Score: {val_result['conformance_score']}%")
    print(f"    • Resources Checked: {val_result['valid_resources_count']} / {val_result['total_resources_checked']} passed")
    print(f"    • Issues Summary: {val_result['issues_summary']}")
    if val_result["issues"]:
        for issue in val_result["issues"]:
            print(f"        - [{issue['severity'].upper()}] {issue['location']}: {issue['message']}")
    print()

# 2. Test intentional invalidation (removing Observation status and breaking reference)
print("[5] Testing Synthetic Violation Detection:")
corrupted_bundle = json.loads(json.dumps(bundle))
for entry in corrupted_bundle["entry"]:
    if entry["resource"]["resourceType"] == "Observation":
        # Delete required status and delete unit
        del entry["resource"]["status"]
        if "valueQuantity" in entry["resource"]:
            del entry["resource"]["valueQuantity"]["unit"]
        break

corrupt_val = validate_fhir_bundle(corrupted_bundle, profile="us-core")
print(f"    • Corrupted Is Valid: {corrupt_val['is_valid']} (Expected False)")
print(f"    • Conformance Score: {corrupt_val['conformance_score']}% (Penalty applied)")
print(f"    • Issues Caught: {len(corrupt_val['issues'])}")
for issue in corrupt_val["issues"]:
    print(f"        - [{issue['severity'].upper()}] {issue['location']} -> {issue['message']}")

print("\nAll Phase 4 Validation tests passed successfully!")
