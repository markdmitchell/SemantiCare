import { useState } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Issue, Severity } from "@/lib/hl7/validate";
import { PanelHeader } from "./shared";

const ICON = { error: AlertCircle, warning: AlertTriangle, info: Info };
const TONE: Record<Severity, string> = { error: "text-destructive", warning: "text-warning", info: "text-info" };

export function ConformancePanel({ issues, score }: { issues: Issue[]; score: number }) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const n = (s: Severity) => issues.filter((i) => i.severity === s).length;
  const shown = issues.filter((i) => filter === "all" || i.severity === filter);
  const groups = shown.reduce<Record<string, Issue[]>>((a, i) => ((a[i.resource] ??= []).push(i), a), {});
  const ring = score >= 85 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const C = 2 * Math.PI * 34;
  return (
    <div className="panel">
      <PanelHeader eyebrow="Stage 07 · Validate" title="US Core 3.1.1 conformance" />
      <div className="flex flex-wrap items-center gap-6 border-b border-border px-5 py-4">
        <div className="relative size-20">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
            <circle cx="40" cy="40" r="34" className="fill-none stroke-secondary" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              className={`fill-none stroke-current ${ring} transition-all`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - score / 100)}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-mono text-xl font-semibold ${ring}`}>{score}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "error", "warning", "info"] as const).map((s) => (
            <button key={s} className={`btn ${filter === s ? "btn-active" : "btn-ghost"}`} onClick={() => setFilter(s)}>
              {s === "all" ? `All ${issues.length}` : `${s} ${n(s)}`}
            </button>
          ))}
        </div>
        <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
          Validated against the rehydrated bundle. Errors block US Core conformance; warnings are Must Support gaps.
        </p>
      </div>
      <div className="max-h-[560px] overflow-auto">
        {Object.entries(groups).map(([res, list]) => (
          <div key={res} className="border-b border-border/60">
            <div className="bg-surface px-4 py-1.5 font-mono text-[11px] text-muted-foreground">{res}</div>
            {list.map((i, k) => {
              const I = ICON[i.severity];
              return (
                <div key={k} className="grid grid-cols-[16px_1fr_auto] items-start gap-3 px-4 py-2 text-xs">
                  <I className={`mt-0.5 size-3.5 ${TONE[i.severity]}`} />
                  <div>
                    <div>{i.message}</div>
                    <div className="code text-muted-foreground">{i.path}</div>
                  </div>
                  <span className="chip chip-neutral">{i.rule}</span>
                </div>
              );
            })}
          </div>
        ))}
        {!shown.length && <p className="px-4 py-10 text-center text-xs text-success">No issues at this level.</p>}
      </div>
    </div>
  );
}
