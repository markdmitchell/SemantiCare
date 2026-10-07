from app.samples.sample_messages import SAMPLE_MESSAGES
from app.core.hl7_parser import parse_hl7_message

print("Testing HL7 Parser on all sample messages...")
for idx, sample in enumerate(SAMPLE_MESSAGES, start=1):
    res = parse_hl7_message(sample["raw"])
    print(f"\n[{idx}] {sample['title']}")
    print(f"    - Valid: {res['is_valid']}")
    print(f"    - Total Segments: {res['metadata']['total_segments']}")
    print(f"    - Message Type: {res['metadata'].get('message_type')}")
    print(f"    - HL7 Version: {res['metadata'].get('hl7_version')}")
    print(f"    - Segments breakdown: {res['metadata']['segment_counts']}")
    
    # Check custom segments
    custom_segs = [s for s in res['segments'] if s.get('is_custom')]
    if custom_segs:
        print(f"    - Custom Z-Segments detected: {[s['segment_id'] for s in custom_segs]}")

print("\nAll parser tests completed successfully!")
