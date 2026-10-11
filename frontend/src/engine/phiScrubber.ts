/**
 * Zero-Trust Reversible PHI Scrubber and Token Vault
 * Ported 1:1 from app/security/phi_scrubber.py
 */

export interface PHIEntity {
  entity_type: string;
  original_value: string;
  token: string;
  location: string;
  confidence: number;
}

export interface PHIEntityAudit {
  entity_type: string;
  token: string;
  location: string;
  preview: string;
}

export interface PHIAudit {
  total_redactions: number;
  entity_breakdown: Record<string, number>;
  entities: PHIEntityAudit[];
}

export class TokenVault {
  tokenToOriginal: Record<string, string> = {};
  originalToToken: Record<string, string> = {};
  detectedEntities: PHIEntity[] = [];

  register(original: string, entityType: string, location: string): string {
    const cleanOrig = (original || '').trim();
    if (!cleanOrig) return original;

    if (this.originalToToken[cleanOrig]) {
      return this.originalToToken[cleanOrig];
    }

    const typeCount = this.detectedEntities.filter((e) => e.entity_type === entityType).length + 1;
    const token = `[${entityType}_${typeCount}]`;

    this.tokenToOriginal[token] = cleanOrig;
    this.originalToToken[cleanOrig] = token;
    this.detectedEntities.push({
      entity_type: entityType,
      original_value: cleanOrig,
      token,
      location,
      confidence: 1.0,
    });
    return token;
  }

  rehydrateText(text: string): string {
    if (!text) return text;
    let result = text;
    for (const [token, original] of Object.entries(this.tokenToOriginal)) {
      result = result.split(token).join(original);
    }
    return result;
  }

  rehydrateString(text: string): string {
    return this.rehydrateText(text);
  }

  count(): number {
    return this.detectedEntities.length;
  }

  rehydrateData(data: any): any {
    if (typeof data === 'string') {
      return this.rehydrateText(data);
    } else if (Array.isArray(data)) {
      return data.map((item) => this.rehydrateData(item));
    } else if (data !== null && typeof data === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        out[k] = this.rehydrateData(v);
      }
      return out;
    }
    return data;
  }

  toAuditDict(): PHIAudit {
    const typeCounts: Record<string, number> = {};
    for (const e of this.detectedEntities) {
      typeCounts[e.entity_type] = (typeCounts[e.entity_type] || 0) + 1;
    }

    return {
      total_redactions: this.detectedEntities.length,
      entity_breakdown: typeCounts,
      entities: this.detectedEntities.map((e) => ({
        entity_type: e.entity_type,
        token: e.token,
        location: e.location,
        preview: e.original_value.length > 2 ? `${e.original_value.slice(0, 2)}***` : '***',
      })),
    };
  }
}

export function scrubHl7Message(rawMessage: string): { scrubbed: string; vault: TokenVault } {
  const vault = new TokenVault();
  const lines = rawMessage
    .trim()
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const scrubbedLines: string[] = [];

  lines.forEach((line, lineIdx) => {
    if (!line) return;

    const parts = line.split('|');
    const segId = parts[0].trim();

    if (segId === 'PID') {
      // PID-3: Patient Identifier List (MRN)
      if (parts.length > 3 && parts[3].trim()) {
        const origMrn = parts[3];
        const mrnComps = origMrn.split('^');
        const tokenMrn = vault.register(mrnComps[0], 'PATIENT_MRN', `PID-3.1 (Line ${lineIdx + 1})`);
        mrnComps[0] = tokenMrn;
        parts[3] = mrnComps.join('^');
      }

      // PID-5: Patient Legal Name (Family^Given^Middle^Suffix^Prefix)
      if (parts.length > 5 && parts[5].trim()) {
        const nameParts = parts[5].split('^');
        if (nameParts.length > 0 && nameParts[0]) {
          nameParts[0] = vault.register(nameParts[0], 'PATIENT_FAMILY_NAME', `PID-5.1 (Line ${lineIdx + 1})`);
        }
        if (nameParts.length > 1 && nameParts[1]) {
          nameParts[1] = vault.register(nameParts[1], 'PATIENT_GIVEN_NAME', `PID-5.2 (Line ${lineIdx + 1})`);
        }
        if (nameParts.length > 2 && nameParts[2]) {
          nameParts[2] = vault.register(nameParts[2], 'PATIENT_MIDDLE_NAME', `PID-5.3 (Line ${lineIdx + 1})`);
        }
        parts[5] = nameParts.join('^');
      }

      // PID-7: Date/Time of Birth
      if (parts.length > 7 && parts[7].trim()) {
        parts[7] = vault.register(parts[7], 'PATIENT_DOB', `PID-7 (Line ${lineIdx + 1})`);
      }

      // PID-11: Patient Address (Street^Other^City^State^Zip^Country)
      if (parts.length > 11 && parts[11].trim()) {
        const addrParts = parts[11].split('^');
        if (addrParts.length > 0 && addrParts[0]) {
          addrParts[0] = vault.register(addrParts[0], 'STREET_ADDRESS', `PID-11.1 (Line ${lineIdx + 1})`);
        }
        if (addrParts.length > 4 && addrParts[4]) {
          addrParts[4] = vault.register(addrParts[4], 'POSTAL_CODE', `PID-11.5 (Line ${lineIdx + 1})`);
        }
        parts[11] = addrParts.join('^');
      }

      // PID-13: Home Phone
      if (parts.length > 13 && parts[13].trim()) {
        parts[13] = vault.register(parts[13], 'PHONE_NUMBER', `PID-13 (Line ${lineIdx + 1})`);
      }

      // PID-19: SSN
      if (parts.length > 19 && parts[19].trim()) {
        parts[19] = vault.register(parts[19], 'SSN', `PID-19 (Line ${lineIdx + 1})`);
      }
    } else if (segId === 'NK1') {
      // NK1-2: Next of Kin Name
      if (parts.length > 2 && parts[2].trim()) {
        const nkParts = parts[2].split('^');
        for (let i = 0; i < Math.min(3, nkParts.length); i++) {
          if (nkParts[i]) {
            nkParts[i] = vault.register(nkParts[i], 'CONTACT_NAME', `NK1-2.${i + 1} (Line ${lineIdx + 1})`);
          }
        }
        parts[2] = nkParts.join('^');
      }

      // NK1-4: Contact Address
      if (parts.length > 4 && parts[4].trim()) {
        const nkAddr = parts[4].split('^');
        if (nkAddr.length > 0 && nkAddr[0]) {
          nkAddr[0] = vault.register(nkAddr[0], 'STREET_ADDRESS', `NK1-4.1 (Line ${lineIdx + 1})`);
        }
        parts[4] = nkAddr.join('^');
      }

      // NK1-5: Contact Phone
      if (parts.length > 5 && parts[5].trim()) {
        parts[5] = vault.register(parts[5], 'PHONE_NUMBER', `NK1-5 (Line ${lineIdx + 1})`);
      }
    } else if (segId === 'PV1') {
      // PV1-7: Attending Doctor (ID^Family^Given...)
      if (parts.length > 7 && parts[7].trim()) {
        const docParts = parts[7].split('^');
        if (docParts.length > 0 && docParts[0]) {
          docParts[0] = vault.register(docParts[0], 'PRACTITIONER_NPI', `PV1-7.1 (Line ${lineIdx + 1})`);
        }
        if (docParts.length > 1 && docParts[1]) {
          docParts[1] = vault.register(docParts[1], 'PRACTITIONER_NAME', `PV1-7.2 (Line ${lineIdx + 1})`);
        }
        parts[7] = docParts.join('^');
      }

      // PV1-19: Visit Number
      if (parts.length > 19 && parts[19].trim()) {
        parts[19] = vault.register(parts[19], 'VISIT_NUMBER', `PV1-19 (Line ${lineIdx + 1})`);
      }
    }

    // Heuristic scan for SSN pattern (\d{3}-\d{2}-\d{4}) across any segment
    let lineJoined = parts.join('|');
    const ssnMatches = lineJoined.match(/\b\d{3}-\d{2}-\d{4}\b/g) || [];
    for (const ssn of ssnMatches) {
      const tok = vault.register(ssn, 'SSN', `Pattern Scan (Line ${lineIdx + 1})`);
      lineJoined = lineJoined.split(ssn).join(tok);
    }

    scrubbedLines.push(lineJoined);
  });

  const sanitizedMessage = scrubbedLines.join('\r');
  return { scrubbed: sanitizedMessage, vault };
}
