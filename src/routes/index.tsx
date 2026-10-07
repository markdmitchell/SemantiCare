import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, FileInput, GitBranch, Lock, Network, ShieldCheck, Users, FileJson } from "lucide-react";
import { parseHL7 } from "@/lib/hl7/parser";
import { SAMPLES, type SampleKey } from "@/lib/hl7/samples";
import { scrubMessage } from "@/lib/hl7/phi";
import { ground, type Resolutions } from "@/lib/hl7/terminology";
import { buildBundle } from "@/lib/hl7/fhir";
import { score as scoreOf, validateBundle } from "@/lib/hl7/validate";
import { ParseTree } from "@/components/workbench/ParseTree";
import { VaultPanel } from "@/components/workbench/VaultPanel";
import { TerminologyPanel } from "@/components/workbench/TerminologyPanel";
import { HitlDeck } from "@/components/workbench/HitlDeck";
import { FhirPanel } from "@/components/workbench/FhirPanel";
import { ConformancePanel } from "@/components/workbench/ConformancePanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SynapseHL7 — HL7 v2 to US Core FHIR R4 Workbench" },
      {
        name: "description",
        content: "Ingest ADT, ORU and MDM messages, vault PHI, ground to LOINC/UCUM, resolve ambiguities and validate US Core 3.1.1 FHIR bundles.",
      },
      { property: "og:title", content: "SynapseHL7 — Clinical Interop Workbench" },
      { property: "og:description", content: "HL7 v2 → PHI vault → LOINC/UCUM → HITL → FHIR R4 → US Core 3.1.1 validation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workbench,
});

type Stage = "parse" | "vault" | "ground" | "hitl" | "fhir" | "validate";

function Workbench() {
  const [sample, setSample] = useState<SampleKey | null>("ORU");
  const [input, setInput] = useState<string>(SAMPLES.ORU);
  const [stage, setStage] = useState<Stage>("parse");
  const [res, setRes] = useState<Resolutions>({});
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => setRes({}), [input]);

  const parsed = useMemo(() => parseHL7(input), [input]);
  const scrub = useMemo(() => (ready ? scrubMessage(parsed) : null), [parsed, ready]);
  const g = useMemo(() => ground(parsed, res), [parsed, res]);
  const bundleTok = useMemo(() => (scrub ? buildBundle(scrub.message, g) : null), [scrub, g]);
  const bundleFull = useMemo(() => buildBundle(parsed, g), [parsed, g]);
  const issues = useMemo(() => validateBundle(bundleFull), [bundleFull]);
  const score = scoreOf(issues);
  const pending = g.ambiguities.filter((a) => res[a.id] === undefined).length;
  const autoCount = g.observations.filter((o) => o.codeStatus === "auto").length;
  const coded = g.observations.filter((o) => o.codeStatus !== "none").length;

  const steps: { id: Stage; label: string; icon: typeof Activity; meta: string; tone: string }[] = [
    { id: "parse", label: "Parse", icon: GitBranch, meta: `${parsed.segments.length} seg`, tone: parsed.errors.length ? "chip-error" : "chip-success" },
    { id: "vault", label: "PHI Vault", icon: Lock, meta: `${scrub?.vault.list().length ?? 0} tok`, tone: "chip-phi" },
    { id: "ground", label: "Ground", icon: Network, meta: coded ? `${autoCount}/${coded} auto` : g.doc ? "doc" : "—", tone: "chip-primary" },
    { id: "hitl", label: "HITL", icon: Users, meta: g.ambiguities.length ? `${pending} open` : "clear", tone: pending ? "chip-warning" : "chip-success" },
    { id: "fhir", label: "FHIR R4", icon: FileJson, meta: `${bundleFull.entry.length} res`, tone: "chip-primary" },
    { id: "validate", label: "US Core", icon: ShieldCheck, meta: `${score}`, tone: score >= 85 ? "chip-success" : score >= 60 ? "chip-warning" : "chip-error" },
  ];

  const load = (k: SampleKey) => {
    setSample(k);
    setInput(SAMPLES[k]);
    setStage(k === "ADT" ? "vault" : "hitl");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="glow-ring flex size-8 items-center justify-center rounded-md bg-accent">
              <Activity className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                Synapse<span className="text-primary">HL7</span>
              </h1>
              <p className="eyebrow">Clinical interop workbench</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="chip chip-neutral">{parsed.type ? `${parsed.type}^${parsed.trigger}` : "no MSH-9"}</span>
            <span className="chip chip-neutral">ctrl {parsed.controlId || "—"}</span>
            <span className="chip chip-neutral">HL7 v{parsed.version || "?"}</span>
            <span className="chip chip-primary">FHIR R4 · US Core 3.1.1</span>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-5 pb-3">
          {steps.map((s, i) => {
            const I = s.icon;
            const on = stage === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStage(s.id)}
                className={`flex min-w-[150px] flex-1 items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors ${
                  on ? "glow-ring border-primary/60 bg-accent/60" : "border-border bg-card/60 hover:border-primary/40"
                }`}
              >
                <span className="font-mono text-[10px] text-muted-foreground">0{i + 2}</span>
                <I className={`size-4 ${on ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium">{s.label}</span>
                <span className={`chip ${s.tone} ml-auto`}>{s.meta}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-5 py-5 lg:grid-cols-[400px_1fr]">
        <aside className="space-y-4">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Stage 01 · Ingest</div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <FileInput className="size-3.5 text-primary" /> HL7 v2 source
                </h2>
              </div>
              <div className="flex gap-1">
                {(Object.keys(SAMPLES) as SampleKey[]).map((k) => (
                  <button key={k} className={`btn ${sample === k ? "btn-active" : "btn-ghost"}`} onClick={() => load(k)}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSample(null);
              }}
              spellCheck={false}
              placeholder="Paste an HL7 v2 message starting with MSH|^~\&|…"
              className="code block h-[420px] w-full resize-y bg-surface p-3 text-[11.5px] outline-none focus:bg-background"
            />
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span>
                {input.split(/\r?\n|\r/).filter(Boolean).length} lines · {input.length} chars
              </span>
              <button className="btn btn-ghost" onClick={() => setInput("")}>
                Clear
              </button>
            </div>
          </div>
          {(parsed.errors.length > 0 || parsed.warnings.length > 0) && (
            <div className="panel space-y-1.5 p-4 text-xs">
              <div className="eyebrow mb-1">Parser diagnostics</div>
              {parsed.errors.map((e) => (
                <div key={e} className="text-destructive">✕ {e}</div>
              ))}
              {parsed.warnings.map((w) => (
                <div key={w} className="text-warning">△ {w}</div>
              ))}
            </div>
          )}
          <div className="panel p-4 text-[11px] leading-relaxed text-muted-foreground">
            <div className="eyebrow mb-1.5">Trust boundary</div>
            Processing runs entirely in this browser tab. PHI is tokenized before grounding and translation; the vault is
            discarded when you change the message or reload.
          </div>
        </aside>

        <section className="min-w-0">
          {!ready || !scrub || !bundleTok ? (
            <div className="panel h-96 animate-pulse" />
          ) : stage === "parse" ? (
            <ParseTree msg={parsed} />
          ) : stage === "vault" ? (
            <VaultPanel scrub={scrub} />
          ) : stage === "ground" ? (
            <TerminologyPanel g={g} onReview={() => setStage("hitl")} />
          ) : stage === "hitl" ? (
            <HitlDeck
              key={input}
              items={g.ambiguities}
              res={res}
              onResolve={(id, c) =>
                setRes((r) => {
                  const n = { ...r };
                  if (c === undefined) delete n[id];
                  else n[id] = c;
                  return n;
                })
              }
            />
          ) : stage === "fhir" ? (
            <FhirPanel tokenized={bundleTok} full={bundleFull} />
          ) : (
            <ConformancePanel issues={issues} score={score} />
          )}
        </section>
      </main>
    </div>
  );
}
