import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { FIELD_NAMES, SEGMENT_NAMES } from "@/lib/hl7/dictionary";
import { serializeSegment, type HL7Message } from "@/lib/hl7/parser";
import { PanelHeader } from "./shared";

export function ParseTree({ msg }: { msg: HL7Message }) {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true, 2: true });
  const [all, setAll] = useState(false);
  return (
    <div className="panel">
      <PanelHeader eyebrow="Stage 02 · Parse" title="Hierarchical segment tree">
        <span className="chip chip-neutral">
          seg {msg.segments.length} · v{msg.version || "?"}
        </span>
        <button className="btn btn-ghost" onClick={() => setAll((a) => !a)}>
          {all ? "Collapse all" : "Expand all"}
        </button>
      </PanelHeader>
      <div className="divide-y divide-border/60">
        {msg.segments.map((seg, i) => {
          const isOpen = all || open[i];
          const populated = seg.fields.map((f, n) => ({ f, n })).filter(({ f, n }) => n > 0 && f.some((r) => r.some((c) => c.some((s) => s))));
          return (
            <div key={i}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-secondary/40"
              >
                <ChevronRight className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <span className="chip chip-primary w-11 justify-center">{seg.name}</span>
                <span className="text-xs text-muted-foreground">{SEGMENT_NAMES[seg.name] ?? "Z-segment / custom"}</span>
                <span className="ml-auto truncate font-mono text-[11px] text-muted-foreground/70 max-w-[50%]">
                  {serializeSegment(seg, msg.enc).slice(4, 90)}
                </span>
              </button>
              {isOpen && (
                <div className="bg-surface px-4 pb-3 pl-12">
                  {populated.map(({ f, n }) => (
                    <div key={n} className="grid grid-cols-[72px_160px_1fr] items-start gap-3 border-l border-border py-1 pl-3">
                      <span className="code text-primary">
                        {seg.name}-{n}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{FIELD_NAMES[seg.name]?.[n] ?? "—"}</span>
                      <div className="flex flex-col gap-1">
                        {f.map((rep, ri) => (
                          <div key={ri} className="flex flex-wrap items-center gap-1">
                            {f.length > 1 && <span className="chip chip-info">~{ri + 1}</span>}
                            {rep.length === 1 && rep[0].length === 1 ? (
                              <span className="code break-all">{rep[0][0]}</span>
                            ) : (
                              rep.map((c, ci) =>
                                c.join("") ? (
                                  <span key={ci} className="inline-flex items-baseline gap-1 rounded-sm border border-border bg-background/60 px-1.5 py-0.5">
                                    <sup className="font-mono text-[9px] text-muted-foreground">.{ci + 1}</sup>
                                    <span className="code">{c.join(msg.enc.sub)}</span>
                                  </span>
                                ) : null,
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
