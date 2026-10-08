/**
 * HL7 v2 Standard Structural Linter & Conformance Inspector.
 * Analyzes raw HL7 v2 messages and parsed segments for specification compliance,
 * missing mandatory fields, and real-world interface engine pitfalls.
 */

export interface HL7LintIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  segment: string;
  field?: string;
  title: string;
  message: string;
  recommendation: string;
}

export interface HL7LintReport {
  is_compliant: boolean;
  score: number; // 0..100
  total_issues: number;
  errors_count: number;
  warnings_count: number;
  info_count: number;
  issues: HL7LintIssue[];
  hl7_version?: string;
  message_type?: string;
}

export function lintHL7Message(rawHL7: string): HL7LintReport {
  const issues: HL7LintIssue[] = [];
  const cleanInput = rawHL7.trim();

  if (!cleanInput) {
    return {
      is_compliant: false,
      score: 0,
      total_issues: 1,
      errors_count: 1,
      warnings_count: 0,
      info_count: 0,
      issues: [
        {
          id: 'lint-empty',
          severity: 'error',
          segment: 'MSH',
          title: 'Empty Payload',
          message: 'HL7 message payload is empty.',
          recommendation: 'Provide a valid HL7 v2 message starting with MSH segment.',
        },
      ],
    };
  }

  // Check line breaks
  if (rawHL7.includes('\n') && !rawHL7.includes('\r')) {
    issues.push({
      id: 'lint-lf-linebreaks',
      severity: 'info',
      segment: 'DELIMITER',
      title: 'Unix Line Endings Detected',
      message: 'Message uses Unix LF line breaks instead of standard HL7 carriage returns (\\r).',
      recommendation: 'Normalize message with the Format button for strict HL7 interface engine compatibility.',
    });
  }

  const lines = cleanInput.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);

  // MSH Check
  const mshLine = lines.find((l) => l.startsWith('MSH'));
  if (!mshLine) {
    issues.push({
      id: 'lint-missing-msh',
      severity: 'error',
      segment: 'MSH',
      title: 'Missing MSH Header',
      message: 'Every valid HL7 v2 message must begin with an MSH (Message Header) segment.',
      recommendation: 'Prepend standard MSH segment with delimiters and routing metadata.',
    });
  } else {
    // Delimiters
    const fieldDelim = mshLine[3] || '|';
    const encodingChars = mshLine.slice(4, 8);

    if (fieldDelim !== '|') {
      issues.push({
        id: 'lint-nonstandard-field-delim',
        severity: 'warning',
        segment: 'MSH',
        field: 'MSH-1',
        title: 'Non-Standard Field Delimiter',
        message: `Field delimiter is '${fieldDelim}'. Standard HL7 field delimiter is '|'.`,
        recommendation: 'Use standard pipe (|) delimiters for maximum EHR interoperability.',
      });
    }

    if (encodingChars.length < 4) {
      issues.push({
        id: 'lint-short-encoding-chars',
        severity: 'error',
        segment: 'MSH',
        field: 'MSH-2',
        title: 'Invalid Encoding Characters (MSH-2)',
        message: `MSH-2 contains '${encodingChars}'. Standard HL7 requires 4 characters (typically ^~\\&).`,
        recommendation: 'Set MSH-2 to standard encoding characters ^~\\&.',
      });
    }

    const mshParts = mshLine.split(fieldDelim);
    // In MSH, parts[0]="MSH", parts[1]=encoding_chars(MSH-2), parts[2]=MSH-3, etc.
    const msh3 = mshParts[2] || ''; // Sending App
    const msh4 = mshParts[3] || ''; // Sending Facility
    const msh7 = mshParts[6] || ''; // Message Datetime
    const msh9 = mshParts[8] || ''; // Message Type
    const msh10 = mshParts[9] || ''; // Message Control ID
    const msh11 = mshParts[10] || ''; // Processing ID
    const msh12 = mshParts[11] || ''; // Version ID

    if (!msh3) {
      issues.push({
        id: 'lint-msh3-empty',
        severity: 'info',
        segment: 'MSH',
        field: 'MSH-3',
        title: 'Sending Application Empty',
        message: 'MSH-3 (Sending Application) is empty. Populating this assists with audit logs and provenance tracing.',
        recommendation: 'Specify sending application identifier (e.g. EPIC, CERNER, LAB_LIS).',
      });
    }

    if (!msh4) {
      issues.push({
        id: 'lint-msh4-empty',
        severity: 'info',
        segment: 'MSH',
        field: 'MSH-4',
        title: 'Sending Facility Empty',
        message: 'MSH-4 (Sending Facility) is empty. Institutional mapping rules will fallback to global (*).',
        recommendation: 'Specify facility code (e.g. METRO_HEALTH) for facility-scoped mapping memory.',
      });
    }

    if (!msh7) {
      issues.push({
        id: 'lint-msh7-missing',
        severity: 'warning',
        segment: 'MSH',
        field: 'MSH-7',
        title: 'Message Timestamp Missing',
        message: 'MSH-7 (Date/Time of Message) is empty.',
        recommendation: 'Include creation timestamp (e.g. YYYYMMDDHHMMSS) for FHIR Bundle.timestamp traceability.',
      });
    } else if (msh7.length < 8) {
      issues.push({
        id: 'lint-msh7-short',
        severity: 'warning',
        segment: 'MSH',
        field: 'MSH-7',
        title: 'Truncated Message Timestamp',
        message: `MSH-7 timestamp '${msh7}' is under 8 digits (expected YYYYMMDD).`,
        recommendation: 'Provide at least 8 digits representing YYYYMMDD.',
      });
    }

    if (!msh9) {
      issues.push({
        id: 'lint-msh9-missing',
        severity: 'error',
        segment: 'MSH',
        field: 'MSH-9',
        title: 'Message Type Missing (MSH-9)',
        message: 'MSH-9 (Message Type) is mandatory for HL7 processing.',
        recommendation: 'Provide valid message type (e.g. ADT^A01, ORU^R01).',
      });
    }

    if (!msh10) {
      issues.push({
        id: 'lint-msh10-missing',
        severity: 'warning',
        segment: 'MSH',
        field: 'MSH-10',
        title: 'Message Control ID Missing',
        message: 'MSH-10 is missing. Interface engines require unique tracking IDs for deduplication.',
        recommendation: 'Include a unique message control identifier.',
      });
    }

    if (!msh11) {
      issues.push({
        id: 'lint-msh11-missing',
        severity: 'info',
        segment: 'MSH',
        field: 'MSH-11',
        title: 'Processing ID Missing',
        message: 'MSH-11 (Processing ID) is missing; defaults to Production (P).',
        recommendation: "Specify 'P' (Production), 'T' (Training), or 'D' (Debugging).",
      });
    }

    if (!msh12) {
      issues.push({
        id: 'lint-msh12-missing',
        severity: 'warning',
        segment: 'MSH',
        field: 'MSH-12',
        title: 'HL7 Version ID Missing',
        message: 'MSH-12 (Version ID) is empty.',
        recommendation: "Specify HL7 version (e.g. '2.5.1', '2.3').",
      });
    }
  }

  // PID Checks
  const pidLine = lines.find((l) => l.startsWith('PID'));
  if (pidLine) {
    const delim = pidLine[3] || '|';
    const parts = pidLine.split(delim);
    const pid3 = parts[3] || ''; // Patient ID / MRN
    const pid5 = parts[5] || ''; // Patient Name
    const pid7 = parts[7] || ''; // DOB
    const pid8 = parts[8] || ''; // Administrative Sex

    if (!pid3) {
      issues.push({
        id: 'lint-pid3-missing',
        severity: 'error',
        segment: 'PID',
        field: 'PID-3',
        title: 'Patient Identifier Missing (PID-3)',
        message: 'PID-3 (Patient Identifier List / MRN) is required to establish FHIR Patient identity.',
        recommendation: 'Ensure PID-3 includes MRN or national identifier.',
      });
    }

    if (!pid5) {
      issues.push({
        id: 'lint-pid5-missing',
        severity: 'warning',
        segment: 'PID',
        field: 'PID-5',
        title: 'Patient Name Missing (PID-5)',
        message: 'PID-5 (Patient Name) is empty. US Core Patient profile requires family or given name.',
        recommendation: 'Include patient name in standard format (Family^Given^Middle).',
      });
    }

    if (!pid7) {
      issues.push({
        id: 'lint-pid7-missing',
        severity: 'info',
        segment: 'PID',
        field: 'PID-7',
        title: 'Date of Birth Empty (PID-7)',
        message: 'PID-7 (Date of Birth) is empty. Generated FHIR Patient will lack birthDate.',
        recommendation: 'Specify date of birth in YYYYMMDD format.',
      });
    }

    if (pid8 && !['M', 'F', 'O', 'U', 'A', 'N'].includes(pid8.toUpperCase())) {
      issues.push({
        id: 'lint-pid8-invalid',
        severity: 'info',
        segment: 'PID',
        field: 'PID-8',
        title: 'Non-Standard Administrative Sex',
        message: `PID-8 value '${pid8}' does not match standard HL7 Table 0001 (M, F, O, U).`,
        recommendation: "Map administrative sex to standard codes ('M', 'F', 'O', 'U').",
      });
    }
  }

  // PV1 Checks
  const pv1Line = lines.find((l) => l.startsWith('PV1'));
  if (pv1Line) {
    const delim = pv1Line[3] || '|';
    const parts = pv1Line.split(delim);
    const pv1_2 = parts[2] || ''; // Patient Class

    if (!pv1_2) {
      issues.push({
        id: 'lint-pv1-2-missing',
        severity: 'warning',
        segment: 'PV1',
        field: 'PV1-2',
        title: 'Patient Class Missing (PV1-2)',
        message: 'PV1-2 (Patient Class) is empty. Required to map FHIR Encounter.class.',
        recommendation: "Specify encounter class: 'I' (Inpatient), 'O' (Outpatient), 'E' (Emergency).",
      });
    }
  }

  // OBX Checks
  let obxCount = 0;
  lines.forEach((l, idx) => {
    if (l.startsWith('OBX')) {
      obxCount++;
      const delim = l[3] || '|';
      const parts = l.split(delim);
      const valType = parts[2] || '';
      const obsCode = parts[3] || '';
      const obsVal = parts[5] || '';
      const units = parts[6] || '';
      const status = parts[11] || '';

      if (!obsCode) {
        issues.push({
          id: `lint-obx3-empty-${idx}`,
          severity: 'error',
          segment: 'OBX',
          field: `OBX-3 (Line ${idx + 1})`,
          title: 'Observation Identifier Missing',
          message: `OBX #${parts[1] || obxCount} is missing test code in OBX-3.`,
          recommendation: 'Provide LOINC or hospital local test code.',
        });
      }

      if (valType === 'NM' && obsVal && !units) {
        issues.push({
          id: `lint-obx6-unit-${idx}`,
          severity: 'warning',
          segment: 'OBX',
          field: `OBX-6 (Line ${idx + 1})`,
          title: 'Numeric Result Missing UCUM Unit',
          message: `Numeric observation '${obsCode.split('^')[1] || obsCode}' has value '${obsVal}' but OBX-6 unit is empty.`,
          recommendation: 'Specify valid UCUM unit or configure Institutional Mapping Memory rule.',
        });
      }

      if (status && !['F', 'P', 'C', 'X', 'D', 'I', 'R'].includes(status.toUpperCase())) {
        issues.push({
          id: `lint-obx11-status-${idx}`,
          severity: 'info',
          segment: 'OBX',
          field: `OBX-11 (Line ${idx + 1})`,
          title: 'Non-Standard Observation Status',
          message: `OBX-11 status '${status}' does not match standard HL7 Table 0085.`,
          recommendation: "Use standard status code (e.g. 'F' for Final, 'P' for Preliminary).",
        });
      }
    }
  });

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Calculate conformance score (100 base, -20 per error, -6 per warning, -2 per info)
  const penalty = errorsCount * 20 + warningsCount * 6 + infoCount * 2;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    is_compliant: errorsCount === 0,
    score,
    total_issues: issues.length,
    errors_count: errorsCount,
    warnings_count: warningsCount,
    info_count: infoCount,
    issues,
  };
}
