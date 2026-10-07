import { serialize, type HL7Message } from "./parser";

export type PhiCategory = "NAME" | "MRN" | "SSN" | "DOB" | "ADDR" | "PHONE" | "ACCT";
export interface VaultEntry {
  token: string;
  category: PhiCategory;
  original: string;
  locations: string[];
}

export const TOKEN_RE = /«[A-Z]+:[0-9a-f]{6}»/g;

function randHex(): string {
  const b = new Uint8Array(3);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Session-scoped reversible vault. Originals never leave this object. */
export class TokenVault {
  private entries = new Map<string, VaultEntry>();
  private byKey = new Map<string, string>();

  tokenize(cat: PhiCategory, value: string, loc: string): string {
    const key = `${cat}\u0000${value}`;
    let t = this.byKey.get(key);
    if (!t) {
      do t = `«${cat}:${randHex()}»`;
      while (this.entries.has(t));
      this.byKey.set(key, t);
      this.entries.set(t, { token: t, category: cat, original: value, locations: [] });
    }
    this.entries.get(t)!.locations.push(loc);
    return t;
  }
  rehydrate(text: string): string {
    return text.replace(TOKEN_RE, (m) => this.entries.get(m)?.original ?? m);
  }
  list(): VaultEntry[] {
    return [...this.entries.values()];
  }
}

interface Rule {
  seg: string;
  field: number;
  comps: number[];
  cat: PhiCategory;
}
// HIPAA Safe Harbor identifiers (state is retained, per Safe Harbor).
const RULES: Rule[] = [
  { seg: "PID", field: 3, comps: [1], cat: "MRN" },
  { seg: "PID", field: 5, comps: [1, 2, 3], cat: "NAME" },
  { seg: "PID", field: 7, comps: [1], cat: "DOB" },
  { seg: "PID", field: 11, comps: [1, 2, 3, 5], cat: "ADDR" },
  { seg: "PID", field: 13, comps: [1], cat: "PHONE" },
  { seg: "PID", field: 14, comps: [1], cat: "PHONE" },
  { seg: "PID", field: 18, comps: [1], cat: "ACCT" },
  { seg: "PID", field: 19, comps: [1], cat: "SSN" },
  { seg: "NK1", field: 2, comps: [1, 2, 3], cat: "NAME" },
  { seg: "NK1", field: 4, comps: [1, 2, 3, 5], cat: "ADDR" },
  { seg: "NK1", field: 5, comps: [1], cat: "PHONE" },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ScrubResult {
  message: HL7Message;
  vault: TokenVault;
  scrubbedRaw: string;
  roundTripOk: boolean;
  freeTextHits: number;
}

export function scrubMessage(msg: HL7Message): ScrubResult {
  const vault = new TokenVault();
  const segments = structuredClone(msg.segments);

  for (const seg of segments) {
    for (const rule of RULES) {
      if (rule.seg !== seg.name) continue;
      const fv = seg.fields[rule.field];
      if (!fv) continue;
      fv.forEach((rep, ri) => {
        const cat: PhiCategory = seg.name === "PID" && rule.field === 3 && rep[4]?.[0] === "SS" ? "SSN" : rule.cat;
        for (const ci of rule.comps) {
          const comp = rep[ci - 1];
          if (!comp) continue;
          comp.forEach((v, si) => {
            if (v.trim()) {
              const loc = `${seg.name}-${rule.field}.${ci}${fv.length > 1 ? `[${ri + 1}]` : ""}`;
              comp[si] = vault.tokenize(cat, v, loc);
            }
          });
        }
      });
    }
  }

  // Contextual free-text sweep: identifiers already vaulted are hunted in narrative fields.
  const sensitive = vault
    .list()
    .filter((e) => ["NAME", "MRN", "SSN", "PHONE", "ACCT"].includes(e.category) && e.original.length >= 3);
  let freeTextHits = 0;
  const sweep = (s: string, loc: string) => {
    let out = s;
    for (const e of sensitive) {
      const re = new RegExp(`(?<![A-Za-z0-9])${escapeRe(e.original)}(?![A-Za-z0-9])`, "gi");
      out = out.replace(re, (m) => {
        freeTextHits++;
        return vault.tokenize(e.category, m, `${loc} · free text`);
      });
    }
    return out;
  };
  for (const seg of segments) {
    const target =
      seg.name === "OBX" && ["TX", "FT", "ST"].includes(seg.fields[2]?.[0]?.[0]?.[0] ?? "")
        ? 5
        : seg.name === "NTE"
          ? 3
          : 0;
    if (!target || !seg.fields[target]) continue;
    seg.fields[target] = seg.fields[target].map((r) => r.map((c) => c.map((s) => sweep(s, `${seg.name}-${target}`))));
  }

  const message = { ...msg, segments };
  const scrubbedRaw = serialize(message);
  return {
    message,
    vault,
    scrubbedRaw,
    roundTripOk: vault.rehydrate(scrubbedRaw) === serialize(msg),
    freeTextHits,
  };
}
