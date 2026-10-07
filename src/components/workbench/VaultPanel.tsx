import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react";
import type { ScrubResult } from "@/lib/hl7/phi";
import { PanelHeader, Tokenized } from "./shared";

const mask = (s: string) => s.replace(/[A-Za-z0-9]/g, "•");

export function VaultPanel({ scrub }: { scrub: ScrubResult }) {
  const [reveal, setReveal] = useState(false);
  const entries = scrub.vault.list();
  const cats = entries.reduce<Record<string, number>>((a, e) => ((a[e.category] = (a[e.category] ?? 0) + 1), a), {});
  return (
    <div className="space-y-4">
      <div className="panel">
        <PanelHeader eyebrow="Stage 03 · Zero-trust scrub" title="Reversible token vault">
          {scrub.roundTripOk ? (
            <span className="chip chip-success">
              <ShieldCheck className="size-3" /> round-trip verified
            </span>
          ) : (
            <span className="chip chip-error">
              <ShieldAlert className="size-3" /> round-trip mismatch
            </span>
          )}
          <button className="btn btn-ghost" onClick={() => setReveal((r) => !r)}>
            {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {reveal ? "Mask originals" : "Reveal originals"}
          </button>
        </PanelHeader>
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          <span className="chip chip-phi">{entries.length} tokens</span>
          <span className="chip chip-neutral">{scrub.freeTextHits} free-text hits</span>
          {Object.entries(cats).map(([c, n]) => (
            <span key={c} className="chip chip-neutral">
              {c} × {n}
            </span>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">
            Originals stay in this browser session only. Downstream stages see tokens.
          </span>
        </div>
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="eyebrow">
                <th className="px-4 py-2 font-medium">Token</th>
                <th className="px-2 py-2 font-medium">Class</th>
                <th className="px-2 py-2 font-medium">Original</th>
                <th className="px-4 py-2 font-medium">Locations</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.token} className="border-t border-border/60">
                  <td className="px-4 py-1.5">
                    <span className="phi-token code">{e.token}</span>
                  </td>
                  <td className="px-2">
                    <span className="chip chip-neutral">{e.category}</span>
                  </td>
                  <td className="code px-2">{reveal ? e.original : mask(e.original)}</td>
                  <td className="px-4 font-mono text-[11px] text-muted-foreground">{e.locations.join(", ")}</td>
                </tr>
              ))}
              {!entries.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No PHI detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <PanelHeader eyebrow="Scrubbed payload" title="De-identified HL7 stream" />
        <pre className="code max-h-[320px] overflow-auto whitespace-pre-wrap break-all p-4">
          <Tokenized text={scrub.scrubbedRaw} />
        </pre>
      </div>
    </div>
  );
}
