import { useState } from "react";
import { Copy, Download } from "lucide-react";
import type { Bundle } from "@/lib/hl7/fhir";
import { PanelHeader, Tokenized } from "./shared";

export function FhirPanel({ tokenized, full }: { tokenized: Bundle; full: Bundle }) {
  const [mode, setMode] = useState<"tok" | "full">("tok");
  const [focus, setFocus] = useState<number | "all">("all");
  const b = mode === "tok" ? tokenized : full;
  const json = JSON.stringify(focus === "all" ? b : b.entry[focus]?.resource, null, 2);
  const counts = b.entry.reduce<Record<string, number>>((a, e) => ((a[e.resource.resourceType] = (a[e.resource.resourceType] ?? 0) + 1), a), {});
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: "application/fhir+json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bundle-${mode === "tok" ? "deidentified" : "identified"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="panel">
      <PanelHeader eyebrow="Stage 06 · Translate" title="FHIR R4 transaction Bundle">
        <div className="flex rounded-md border border-border p-0.5">
          <button className={`btn border-0 ${mode === "tok" ? "btn-active" : "text-muted-foreground"}`} onClick={() => setMode("tok")}>
            De-identified
          </button>
          <button className={`btn border-0 ${mode === "full" ? "btn-active" : "text-muted-foreground"}`} onClick={() => setMode("full")}>
            Rehydrated
          </button>
        </div>
        <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(b, null, 2))}>
          <Copy className="size-3.5" /> Copy
        </button>
        <button className="btn btn-ghost" onClick={download}>
          <Download className="size-3.5" /> .json
        </button>
      </PanelHeader>
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
        <button className={`btn ${focus === "all" ? "btn-active" : "btn-ghost"}`} onClick={() => setFocus("all")}>
          Bundle · {b.entry.length}
        </button>
        {b.entry.map((e, i) => (
          <button key={e.fullUrl} className={`btn ${focus === i ? "btn-active" : "btn-ghost"}`} onClick={() => setFocus(i)}>
            {e.resource.resourceType}
          </button>
        ))}
      </div>
      <div className="flex gap-3 border-b border-border px-4 py-1.5 text-[11px] text-muted-foreground">
        {Object.entries(counts).map(([k, v]) => (
          <span key={k}>
            {k} <span className="text-foreground">{v}</span>
          </span>
        ))}
      </div>
      <pre className="code max-h-[620px] overflow-auto p-4">
        <Tokenized text={json ?? ""} />
      </pre>
    </div>
  );
}
