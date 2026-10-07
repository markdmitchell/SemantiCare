/**
 * HL7 v2 Metadata Dictionary (ported from app/core/hl7_dictionary.py)
 */

export interface FieldDef {
  name: string;
  type: string;
  description: string;
}

export interface SegmentDef {
  name: string;
  description: string;
  fields: Record<number, FieldDef>;
  is_custom?: boolean;
}

export const SEGMENT_DEFINITIONS: Record<string, SegmentDef> = {
  MSH: {
    name: "Message Header",
    description: "Defines the intent, source, destination, and some specifics of the syntax of a message.",
    fields: {
      1: { name: "Field Separator", type: "ST", description: "Separator character between fields." },
      2: { name: "Encoding Characters", type: "ST", description: "Component, repetition, escape, and subcomponent characters." },
      3: { name: "Sending Application", type: "HD", description: "Identifies the sending application system." },
      4: { name: "Sending Facility", type: "HD", description: "Identifies the sending facility/organization." },
      5: { name: "Receiving Application", type: "HD", description: "Identifies the receiving application system." },
      6: { name: "Receiving Facility", type: "HD", description: "Identifies the receiving facility/organization." },
      7: { name: "Date/Time Of Message", type: "TS", description: "Timestamp when message was created by sending system." },
      8: { name: "Security", type: "ST", description: "Security classification or credentials." },
      9: { name: "Message Type", type: "MSG", description: "Message code, trigger event, and message structure (e.g. ADT^A01^ADT_A01)." },
      10: { name: "Message Control ID", type: "ST", description: "Unique identifier assigned by sending system." },
      11: { name: "Processing ID", type: "PT", description: "Production (P), Debugging (D), or Training (T)." },
      12: { name: "Version ID", type: "VID", description: "HL7 standard version (e.g. 2.3, 2.4, 2.5.1, 2.7)." },
      15: { name: "Accept Acknowledgment Type", type: "ID", description: "Conditions under which accept ack is required." },
      16: { name: "Application Acknowledgment Type", type: "ID", description: "Conditions under which application ack is required." },
      18: { name: "Character Set", type: "ID", description: "Character encoding set (e.g. UNICODE UTF-8, ASCII)." },
    },
  },
  EVN: {
    name: "Event Type",
    description: "Communicates the trigger event and associated timestamps.",
    fields: {
      1: { name: "Event Type Code", type: "ID", description: "Trigger event code (e.g. A01, A08, R01)." },
      2: { name: "Recorded Date/Time", type: "TS", description: "Date/time the event was recorded." },
      3: { name: "Date/Time Planned Event", type: "TS", description: "Planned event timestamp." },
      4: { name: "Event Reason Code", type: "IS", description: "Reason for the event trigger." },
      5: { name: "Operator ID", type: "XCN", description: "Person responsible for the event entry." },
      6: { name: "Event Occurred", type: "TS", description: "Date/time the clinical event actually occurred." },
    },
  },
  PID: {
    name: "Patient Identification",
    description: "Primary clinical demographics and identification of the patient.",
    fields: {
      1: { name: "Set ID - PID", type: "SI", description: "Sequence number." },
      2: { name: "Patient ID (External)", type: "CX", description: "External patient identification." },
      3: { name: "Patient Identifier List (MRN)", type: "CX", description: "Medical Record Number (MRN), national ID, or account number." },
      4: { name: "Alternate Patient ID", type: "CX", description: "Alternate identifier." },
      5: { name: "Patient Name", type: "XPN", description: "Legal patient name (Family^Given^Middle^Suffix^Prefix)." },
      6: { name: "Mother's Maiden Name", type: "XPN", description: "Mother's maiden family name." },
      7: { name: "Date/Time of Birth", type: "TS", description: "Patient birth date and time." },
      8: { name: "Administrative Sex", type: "IS", description: "M, F, O, U, A, N." },
      9: { name: "Patient Alias", type: "XPN", description: "Other names used by patient." },
      10: { name: "Race", type: "CWE", description: "Patient race classification." },
      11: { name: "Patient Address", type: "XAD", description: "Physical/mailing address (Street^Other^City^State^Zip^Country)." },
      12: { name: "County Code", type: "IS", description: "County of residence." },
      13: { name: "Phone Number - Home", type: "XTN", description: "Primary contact telecom/telephone." },
      14: { name: "Phone Number - Business", type: "XTN", description: "Work or daytime telephone." },
      15: { name: "Primary Language", type: "CWE", description: "Primary communication language." },
      16: { name: "Marital Status", type: "CWE", description: "Marital status (S, M, D, W)." },
      17: { name: "Religion", type: "CWE", description: "Religious affiliation." },
      18: { name: "Patient Account Number", type: "CX", description: "Billing/financial account number." },
      19: { name: "SSN Number - Patient", type: "ST", description: "Social security number." },
      21: { name: "Mother's Identifier", type: "CX", description: "Identifier for newborn's mother." },
      22: { name: "Ethnic Group", type: "CWE", description: "Ethnicity (e.g. Hispanic or Latino)." },
    },
  },
  PV1: {
    name: "Patient Visit",
    description: "Encounter and visit specific information including location and attending clinician.",
    fields: {
      1: { name: "Set ID - PV1", type: "SI", description: "Sequence number." },
      2: { name: "Patient Class", type: "IS", description: "I (Inpatient), O (Outpatient), E (Emergency), P (Preadmit)." },
      3: { name: "Assigned Patient Location", type: "PL", description: "Point of care / Room / Bed / Facility." },
      4: { name: "Admission Type", type: "IS", description: "Accident, Emergency, Elective, Newborn, Urgent." },
      7: { name: "Attending Doctor", type: "XCN", description: "Primary attending physician/practitioner ID and name." },
      8: { name: "Referring Doctor", type: "XCN", description: "Referring physician." },
      9: { name: "Consulting Doctor", type: "XCN", description: "Consulting clinician." },
      10: { name: "Hospital Service", type: "IS", description: "Clinical department/service (e.g. CAR, MED, SUR)." },
      14: { name: "Admit Source", type: "IS", description: "Referral source or admitting origin." },
      19: { name: "Visit Number", type: "CX", description: "Unique encounter / billing visit number." },
      20: { name: "Financial Class", type: "FC", description: "Payment categorization." },
      36: { name: "Discharge Disposition", type: "IS", description: "Discharged home, transferred, AMA, deceased." },
      44: { name: "Admit Date/Time", type: "TS", description: "Encounter start timestamp." },
      45: { name: "Discharge Date/Time", type: "TS", description: "Encounter end timestamp." },
    },
  },
  ORC: {
    name: "Common Order",
    description: "Order tracking and workflow communication for lab, radiology, pharmacy orders.",
    fields: {
      1: { name: "Order Control", type: "ID", description: "NW (New), CA (Cancel), RE (Replacement), SC (Status change)." },
      2: { name: "Placer Order Number", type: "EI", description: "Order ID assigned by placing application." },
      3: { name: "Filler Order Number", type: "EI", description: "Order ID assigned by fulfilling system (e.g. LIS/RIS)." },
      4: { name: "Placer Group Number", type: "EI", description: "Order group identifier." },
      5: { name: "Order Status", type: "ID", description: "IP (In Process), CM (Completed), CA (Cancelled)." },
      9: { name: "Date/Time of Transaction", type: "TS", description: "Timestamp of order event." },
      12: { name: "Ordering Provider", type: "XCN", description: "Clinician placing the order." },
    },
  },
  OBR: {
    name: "Observation Request",
    description: "Specific diagnostic study, battery, or lab panel requested.",
    fields: {
      1: { name: "Set ID - OBR", type: "SI", description: "Sequence number." },
      2: { name: "Placer Order Number", type: "EI", description: "Placer order number for this report." },
      3: { name: "Filler Order Number", type: "EI", description: "Filler order accession number." },
      4: { name: "Universal Service Identifier", type: "CWE", description: "Lab test or panel code (Code^Text^System)." },
      7: { name: "Observation Date/Time", type: "TS", description: "Specimen collection / observation time." },
      14: { name: "Specimen Received Date/Time", type: "TS", description: "Time lab received specimen." },
      16: { name: "Ordering Provider", type: "XCN", description: "Provider ordering the diagnostic test." },
      22: { name: "Results Rpt/Status Chng - Date/Time", type: "TS", description: "Date/time report was signed/finalized." },
      25: { name: "Result Status", type: "ID", description: "F (Final), P (Preliminary), C (Corrected)." },
    },
  },
  OBX: {
    name: "Observation / Result",
    description: "Single observation, lab analyte measurement, vital sign, or report paragraph.",
    fields: {
      1: { name: "Set ID - OBX", type: "SI", description: "Sequence number." },
      2: { name: "Value Type", type: "ID", description: "NM (Numeric), ST (String), TX (Text), CE/CWE (Coded), SN (Structured Numeric)." },
      3: { name: "Observation Identifier", type: "CWE", description: "Test/analyte code and description (e.g. 2345-7^Glucose^LN)." },
      4: { name: "Observation Sub-ID", type: "ST", description: "Groups related observations or repeats." },
      5: { name: "Observation Value", type: "varies", description: "Actual result value (number, text, or coded)." },
      6: { name: "Units", type: "CWE", description: "Unit of measure (e.g. mg/dL, mmol/L, mm[Hg])." },
      7: { name: "References Range", type: "ST", description: "Normal reference interval (e.g. 70-99)." },
      8: { name: "Abnormal Flags", type: "IS", description: "L (Low), H (High), LL (Critically Low), HH (Critically High), N (Normal), A (Abnormal)." },
      11: { name: "Observation Result Status", type: "ID", description: "F (Final), P (Preliminary), C (Corrected), D (Deleted)." },
      14: { name: "Date/Time of the Observation", type: "TS", description: "Date and time observation was performed." },
      15: { name: "Producer's ID", type: "CWE", description: "Laboratory or analyzer ID." },
      16: { name: "Responsible Observer", type: "XCN", description: "Technologist or pathologist certifying result." },
    },
  },
  NTE: {
    name: "Notes and Comments",
    description: "Unstructured free-text clinical comments, interpretations, or instructions.",
    fields: {
      1: { name: "Set ID - NTE", type: "SI", description: "Sequence number." },
      2: { name: "Source of Comment", type: "ID", description: "L (Ancillary / Lab), P (Orderer), O (Other)." },
      3: { name: "Comment", type: "FT", description: "Free text clinical note or interpretation." },
      4: { name: "Comment Type", type: "CWE", description: "PI (Patient Instructions), GI (General), RE (Remark)." },
    },
  },
  AL1: {
    name: "Patient Allergy Information",
    description: "Known allergies, intolerances, and adverse reactions.",
    fields: {
      1: { name: "Set ID - AL1", type: "SI", description: "Sequence number." },
      2: { name: "Allergen Type Code", type: "CWE", description: "DA (Drug), FA (Food), MA (Miscellaneous), EA (Environmental)." },
      3: { name: "Allergen Code/Mnemonic/Description", type: "CWE", description: "Allergen identifier and name." },
      4: { name: "Allergy Severity Code", type: "CWE", description: "SV (Severe), MO (Moderate), MI (Mild)." },
      5: { name: "Allergy Reaction Code", type: "ST", description: "Reaction symptom (e.g. Hives, Anaphylaxis)." },
      6: { name: "Identification Date", type: "DT", description: "Date allergy was identified." },
    },
  },
  DG1: {
    name: "Diagnosis",
    description: "Clinical diagnosis codes (ICD-10, SNOMED) and clinical status.",
    fields: {
      1: { name: "Set ID - DG1", type: "SI", description: "Sequence number." },
      2: { name: "Diagnosis Coding Method", type: "ID", description: "Coding scheme (e.g. I10 for ICD-10)." },
      3: { name: "Diagnosis Code - DG1", type: "CWE", description: "Diagnosis code and description (e.g. E11.9^Type 2 diabetes)." },
      4: { name: "Diagnosis Description", type: "ST", description: "Text diagnosis description." },
      5: { name: "Diagnosis Date/Time", type: "TS", description: "Timestamp diagnosis was assigned." },
      6: { name: "Diagnosis Type", type: "IS", description: "A (Admitting), W (Working), F (Final)." },
    },
  },
  NK1: {
    name: "Next of Kin / Associated Parties",
    description: "Emergency contacts, guarantors, or relatives.",
    fields: {
      1: { name: "Set ID - NK1", type: "SI", description: "Sequence number." },
      2: { name: "Name", type: "XPN", description: "Full name of related person." },
      3: { name: "Relationship", type: "CWE", description: "Relationship to patient (e.g. SPO^Spouse, PAR^Parent)." },
      4: { name: "Address", type: "XAD", description: "Address of related person." },
      5: { name: "Phone Number", type: "XTN", description: "Contact phone number." },
    },
  },
  IN1: {
    name: "Insurance",
    description: "Primary and secondary insurance coverage and policy information.",
    fields: {
      1: { name: "Set ID - IN1", type: "SI", description: "Sequence number." },
      2: { name: "Insurance Plan ID", type: "CWE", description: "Plan identifier." },
      3: { name: "Insurance Company ID", type: "CX", description: "Payer / insurer company identifier." },
      4: { name: "Insurance Company Name", type: "XON", description: "Name of insurance company." },
      15: { name: "Plan Type", type: "IS", description: "HMO, PPO, POS, Commercial, Medicare, Medicaid." },
      36: { name: "Policy Number", type: "ST", description: "Subscriber policy / member number." },
    },
  },
};

export const COMPONENT_SCHEMAS: Record<string, string[]> = {
  XPN: ["Family Name", "Given Name", "Second / Middle Name", "Suffix", "Prefix", "Degree", "Name Type Code"],
  CX: ["ID Number", "Check Digit", "Check Digit Scheme", "Assigning Authority", "Identifier Type Code", "Assigning Facility"],
  XAD: ["Street Address", "Other Designation", "City", "State or Province", "Zip or Postal Code", "Country", "Address Type"],
  CWE: ["Identifier", "Text", "Name of Coding System", "Alternate Identifier", "Alternate Text", "Name of Alternate Coding System"],
  XTN: ["Telephone Number", "Telecommunication Use Code", "Telecommunication Equipment Type", "Email Address", "Country Code", "Area/City Code", "Local Number"],
  MSG: ["Message Code", "Trigger Event", "Message Structure"],
  HD: ["Namespace ID", "Universal ID", "Universal ID Type"],
  XCN: ["Person Identifier", "Family Name", "Given Name", "Second / Middle Name", "Suffix", "Prefix", "Degree", "Source Table", "Assigning Authority"],
  PL: ["Point of Care / Room", "Room", "Bed", "Facility", "Location Status", "Person Location Type", "Building", "Floor"],
};

export function getSegmentInfo(segmentId: string): SegmentDef {
  if (SEGMENT_DEFINITIONS[segmentId]) {
    return SEGMENT_DEFINITIONS[segmentId];
  }

  if (segmentId.startsWith("Z")) {
    return {
      name: `Custom Segment (${segmentId})`,
      description: `Proprietary site-specific Z-segment ('${segmentId}'). Contains non-standard EHR hospital data.`,
      fields: {},
      is_custom: true,
    };
  }

  return {
    name: `Segment (${segmentId})`,
    description: `HL7 v2 segment ${segmentId}.`,
    fields: {},
    is_custom: false,
  };
}

export function getFieldInfo(segmentId: string, fieldIndex: number): FieldDef {
  const segInfo = getSegmentInfo(segmentId);
  const fields = segInfo.fields || {};
  if (fields[fieldIndex]) {
    return fields[fieldIndex];
  }

  return {
    name: `Field ${fieldIndex}`,
    type: "ST",
    description: `Field ${fieldIndex} in segment ${segmentId}`,
  };
}

export function getComponentName(dataType: string, componentIndex: number): string {
  const schema = COMPONENT_SCHEMAS[dataType];
  if (schema && componentIndex >= 1 && componentIndex <= schema.length) {
    return schema[componentIndex - 1];
  }
  return `Component ${componentIndex}`;
}
