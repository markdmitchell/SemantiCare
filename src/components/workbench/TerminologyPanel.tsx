import { ArrowRight } from "lucide-react";
import type { GroundingResult } from "@/lib/hl7/terminology";
import { PanelHeader, StatusChip } from "./shared";

export function TerminologyPanel({ g, onReview }: { g: GroundingResult; onReview: () => void }) {
  const obs = g.observations.filter((o) => o.codeStatus !== "none");
  const pending = g.ambiguities.length;
  return (
    <div className="panel">
      <PanelHeader eyebrow="Stage 04 · Ground" title="LOINC / UCUM terminology binding">
        {pending > 0 && (
          <button className="btn btn-ghost" onClick={onReview}>
            Review {pending} in HITL deck <ArrowRight className="size-3.5" />
          </button>
        )}
      </PanelHeader>
      {g.panel && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs">
          <span className="eyebrow">Panel</span>
          <span className="code text-primary">{g.panel.code}</span>
          <span>{g.panel.display}</span>
          <StatusChip s="auto" />
        </div>
      )}
      {g.doc && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 text-xs">
          <span className="eyebrow">Document type</span>
          <span className="code text-muted-foreground">{g.doc.localCode}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          {g.doc.concept ? (
            <>
              <span className="code text-primary">{g.doc.concept.code}</span>
              <span>{g.doc.concept.display}</span>
            </>
          ) : (
            <span className="text-muted-foreground">unbound</span>
          )}
          <StatusChip s={g.doc.status} />
        </div>
      )}
      {obs.length > 0 ? (
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="eyebrow">
                <th className="px-4 py-2 font-medium">OBX</th>
                <th className="px-2 py-2 font-medium">Local</th>
                <th className="px-2 py-2 font-medium">LOINC</th>
                <th className="px-2 py-2 font-medium" />
                <th className="px-2 py-2 font-medium">Value</th>
                <th className="px-2 py-2 font-medium">UCUM</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {obs.map((o) => (
                <tr key={o.segIndex} className="border-t border-border/60 align-top">
                  <td className="code px-4 py-2 text-muted-foreground">{o.setId}</td>
                  <td className="px-2 py-2">
                    <div className="code">{o.localCode}</div>
                    <div className="text-muted-foreground">{o.localText}</div>
                  </td>
                  <td className="px-2 py-2">
                    {o.concept ? (
                      <>
                        <div className="code text-primary">{o.concept.code}</div>
                        <div className="max-w-[260px] text-muted-foreground">{o.concept.display}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <StatusChip s={o.codeStatus} />
                  </td>
                  <td className="code px-2 py-2">
                    {o.value} <span className="text-muted-foreground">{o.rawUnit}</span>
                    {o.flag && o.flag !== "N" && <span className="chip chip-error ml-1.5">{o.flag}</span>}
                  </td>
                  <td className="code px-2 py-2 text-primary">{o.ucum ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2">
                    <StatusChip s={o.unitStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !g.doc && <p className="px-4 py-8 text-center text-xs text-muted-foreground">No coded observations in this message.</p>
      )}
    </div>
  );
}
