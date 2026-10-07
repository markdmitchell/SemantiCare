import type { ReactNode } from "react";
import { TOKEN_RE } from "@/lib/hl7/phi";
import type { GroundStatus } from "@/lib/hl7/terminology";

export function Tokenized({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="phi-token">
        {m[0]}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

const STATUS_CHIP: Record<GroundStatus, [string, string]> = {
  auto: ["chip-success", "auto"],
  resolved: ["chip-primary", "human"],
  pending: ["chip-warning", "pending"],
  declined: ["chip-neutral", "kept local"],
  none: ["chip-neutral", "—"],
};
export function StatusChip({ s }: { s: GroundStatus }) {
  const [cls, label] = STATUS_CHIP[s];
  return <span className={`chip ${cls}`}>{label}</span>;
}

export function PanelHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
