import { useEffect, useState } from "react";
import { Check, CornerDownLeft, RotateCcw } from "lucide-react";
import type { Ambiguity, Resolutions } from "@/lib/hl7/terminology";
import { PanelHeader } from "./shared";

const KIND: Record<Ambiguity["kind"], string> = { code: "Concept ambiguity", unit: "Unit ambiguity", doctype: "Document type" };

export function HitlDeck({
  items,
  res,
  onResolve,
}: {
  items: Ambiguity[];
  res: Resolutions;
  onResolve: (id: string, choice: number | undefined) => void;
}) {
  const firstPending = items.find((a) => res[a.id] === undefined)?.id;
  const [activeId, setActiveId] = useState<string | undefined>(firstPending);
  const active = items.find((a) => a.id === activeId) ?? items.find((a) => a.id === firstPending) ?? items[0];
  const done = items.filter((a) => res[a.id] !== undefined).length;

  const choose = (choice: number) => {
    if (!active) return;
    onResolve(active.id, choice);
    const next = items.find((a) => a.id !== active.id && res[a.id] === undefined);
    setActiveId(next?.id ?? active.id);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (!active) return;
      const n = Number(e.key);
      if (e.key === "0") choose(-1);
      else if (n >= 1 && n <= active.candidates.length) choose(n - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!items.length)
    return (
      <div className="panel">
        <PanelHeader eyebrow="Stage 05 · HITL" title="Resolution deck" />
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <Check className="size-6 text-success" />
          <p className="text-sm">No semantic ambiguities. Every term was grounded deterministically.</p>
        </div>
      </div>
    );

  return (
    <div className="panel">
      <PanelHeader eyebrow="Stage 05 · HITL" title="Resolution deck">
        <span className={`chip ${done === items.length ? "chip-success" : "chip-warning"}`}>
          {done}/{items.length} resolved
        </span>
      </PanelHeader>
      <div className="h-1 bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <ol className="border-b border-border md:border-b-0 md:border-r">
          {items.map((a) => {
            const r = res[a.id];
            return (
              <li key={a.id}>
                <button
                  onClick={() => setActiveId(a.id)}
                  className={`flex w-full items-center gap-2 border-l-2 px-3 py-2.5 text-left text-xs ${
                    a.id === active?.id ? "border-primary bg-accent/50" : "border-transparent hover:bg-secondary/40"
                  }`}
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${r === undefined ? "bg-warning" : r < 0 ? "bg-muted-foreground" : "bg-success"}`} />
                  <span className="min-w-0">
                    <span className="block truncate font-mono">{a.source}</span>
                    <span className="block text-[10.5px] text-muted-foreground">{a.location}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {active && (
          <div key={active.id} className="animate-in fade-in slide-in-from-right-2 space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-warning">{KIND[active.kind]}</span>
              <span className="chip chip-neutral">{active.location}</span>
              {res[active.id] !== undefined && (
                <button className="btn btn-ghost ml-auto" onClick={() => onResolve(active.id, undefined)}>
                  <RotateCcw className="size-3" /> Reopen
                </button>
              )}
            </div>
            <div>
              <div className="eyebrow mb-1">Source term</div>
              <div className="font-mono text-2xl font-semibold tracking-tight">{active.source}</div>
              <div className="mt-1 text-xs text-muted-foreground">{active.context}</div>
            </div>
            <p className="rounded-md border border-border bg-surface p-3 text-xs leading-relaxed text-muted-foreground">{active.rationale}</p>
            <div className="space-y-2">
              {active.candidates.map((c, i) => {
                const picked = res[active.id] === i;
                return (
                  <button
                    key={c.code + i}
                    onClick={() => choose(i)}
                    className={`group flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                      picked ? "glow-ring border-primary bg-accent/60" : "border-border hover:border-primary/50 hover:bg-secondary/40"
                    }`}
                  >
                    <kbd className="flex size-6 shrink-0 items-center justify-center rounded border border-border font-mono text-[11px] text-muted-foreground group-hover:text-primary">
                      {i + 1}
                    </kbd>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="code font-semibold text-primary">{c.code}</span>
                        <span className="truncate text-sm">{c.display !== c.code ? c.display : ""}</span>
                      </div>
                      {c.note && <div className="text-[11px] text-muted-foreground">{c.note}</div>}
                    </div>
                    <div className="w-20 shrink-0">
                      <div className="h-1 rounded bg-secondary">
                        <div className="h-full rounded bg-primary" style={{ width: `${c.confidence * 100}%` }} />
                      </div>
                      <div className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{Math.round(c.confidence * 100)}%</div>
                    </div>
                    {picked && <Check className="size-4 text-primary" />}
                  </button>
                );
              })}
              <button
                onClick={() => choose(-1)}
                className={`flex w-full items-center gap-3 rounded-md border border-dashed p-2.5 text-left text-xs ${
                  res[active.id] === -1 ? "border-muted-foreground bg-secondary" : "border-border text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                <kbd className="flex size-6 items-center justify-center rounded border border-border font-mono text-[11px]">0</kbd>
                Keep source term as local code (will fail US Core binding)
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CornerDownLeft className="size-3" /> Press 1–{active.candidates.length} to choose, 0 to keep local.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
