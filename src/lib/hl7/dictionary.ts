export const SEGMENT_NAMES: Record<string, string> = {
  MSH: "Message Header",
  EVN: "Event Type",
  PID: "Patient Identification",
  NK1: "Next of Kin",
  PV1: "Patient Visit",
  OBR: "Observation Request",
  OBX: "Observation / Result",
  NTE: "Notes and Comments",
  TXA: "Transcription Document Header",
  ORC: "Common Order",
  AL1: "Allergy Information",
  DG1: "Diagnosis",
};

export const FIELD_NAMES: Record<string, Record<number, string>> = {
  MSH: { 1: "Field Separator", 2: "Encoding Characters", 3: "Sending Application", 4: "Sending Facility", 5: "Receiving Application", 6: "Receiving Facility", 7: "Date/Time of Message", 9: "Message Type", 10: "Message Control ID", 11: "Processing ID", 12: "Version ID" },
  EVN: { 1: "Event Type Code", 2: "Recorded Date/Time" },
  PID: { 1: "Set ID", 3: "Patient Identifier List", 5: "Patient Name", 7: "Date of Birth", 8: "Administrative Sex", 11: "Patient Address", 13: "Phone – Home", 14: "Phone – Business", 16: "Marital Status", 18: "Patient Account Number", 19: "SSN" },
  NK1: { 1: "Set ID", 2: "Name", 3: "Relationship", 4: "Address", 5: "Phone" },
  PV1: { 1: "Set ID", 2: "Patient Class", 3: "Assigned Location", 7: "Attending Doctor", 10: "Hospital Service", 17: "Admitting Doctor", 19: "Visit Number", 44: "Admit Date/Time", 45: "Discharge Date/Time" },
  OBR: { 1: "Set ID", 2: "Placer Order #", 3: "Filler Order #", 4: "Universal Service ID", 7: "Observation Date/Time", 16: "Ordering Provider", 22: "Results Rpt/Status Chng", 25: "Result Status" },
  OBX: { 1: "Set ID", 2: "Value Type", 3: "Observation Identifier", 5: "Observation Value", 6: "Units", 7: "Reference Range", 8: "Abnormal Flags", 11: "Result Status", 14: "Date/Time of Observation" },
  NTE: { 1: "Set ID", 3: "Comment" },
  TXA: { 1: "Set ID", 2: "Document Type", 3: "Content Presentation", 4: "Activity Date/Time", 5: "Primary Activity Provider", 12: "Unique Document Number", 17: "Completion Status" },
};
