import React from 'react';
import { X, CheckCircle2, Circle, Cpu, GitBranch } from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ onClose }) => {
  const phases = [
    {
      phase: 1,
      title: 'Foundation & Structural Parsing',
      status: 'completed',
      summary: 'Deterministic HL7 v2 parser, standard metadata dictionary, delimiter extraction, and split-studio workspace.',
      details: [
        'Ingest raw HL7 v2 strings (ADT, ORU, MDM)',
        'Resilient line ending & delimiter normalization (| ^ ~ \\ &)',
        'Full segment, field, repetition, and subcomponent AST decomposition',
        'Annotation with standard HL7 data types (XPN, CX, CWE, TS, NM)',
        'Automatic detection of custom hospital Z-segments',
      ],
    },
    {
      phase: 2,
      title: 'The Semantic Mapping Engine',
      status: 'completed',
      summary: 'Zero-trust PHI scrubber token vault, LOINC/UCUM terminology grounding, and FHIR R4 Bundle generation.',
      details: [
        'Local PHI de-identification before any external transmission',
        'Deterministic LOINC catalog grounding preventing hallucinations',
        'Translation to FHIR Patient, Encounter, Observation, DiagnosticReport, Condition, Coverage',
        'Handling compound measurements (Systolic/Diastolic BP)',
        'Automatic inference for custom hospital Z-segments (ZDS, ZTR)',
      ],
    },
    {
      phase: 3,
      title: 'Human-in-the-Loop (HITL) UI',
      status: 'completed',
      summary: 'Interactive Resolution Deck, visual confidence color-coding, and direct Monaco JSON editing.',
      details: [
        'Dedicated HITL Resolution Deck for unresolved semantic flags',
        'Interactive unit selection for missing UCUM measurements (e.g. kg vs lbs)',
        'Local code confirmation with ranked LOINC candidates',
        'Full Monaco Editor with syntax checking and live JSON editing',
        'Dynamic in-memory bundle mutation and confidence recalculation',
      ],
    },
    {
      phase: 4,
      title: 'FHIR R4 Validation & Re-Hydration',
      status: 'completed',
      summary: 'Strict FHIR R4 schema validation, US Core profile rule enforcement, and dual-mode export.',
      details: [
        'Sub-second schema validation using fhir.resources (Pydantic v2)',
        'US Core 3.1.1 & HL7 Base R4 profile conformance scoring',
        'Visual Issue Inspector with rule, path, and severity breakdowns',
        'Reversible local Token Vault re-hydration without external network calls',
        'Export to Standard JSON Transaction Bundle or Bulk FHIR NDJSON',
      ],
    },
    {
      phase: 5,
      title: 'Enterprise Polish & Containerization',
      status: 'completed',
      summary: 'Production containerization, 5 sanitized clinical scenarios, Docker Compose, and cloud deployment ready.',
      details: [
        'Multi-stage Dockerfiles for backend (Python/Uvicorn) and frontend (Vite/Nginx)',
        'Single-command orchestration with docker-compose.yml',
        'Pre-loaded gallery of 5 complex, real-world clinical edge cases',
        'Live health monitoring and self-healing background workers',
        'Cloud ready manifests for Vercel, Render, AWS, and GCP Cloud Run',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-base">System Architecture & Roadmap</h3>
              <p className="text-xs text-slate-400">AI-Assisted HL7 v2 to FHIR R4 Semantic Data Mapper</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Architectural Pattern Note */}
          <div className="bg-gradient-to-r from-cyan-950/60 to-emerald-950/60 border border-cyan-800/60 rounded-xl p-4 space-y-2">
            <h4 className="font-semibold text-cyan-200 text-sm flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              The "Hybrid Rules-First + AI-Gap-Fill" Pattern
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Standard HL7 fields (timestamps, patient identifiers, names) are parsed deterministically at microsecond speed with 100% precision. The semantic engine is then targeted specifically where traditional parsers fail: <strong>local non-standard lab codes, ambiguous clinical units, unstructured clinical notes, and proprietary hospital Z-segments</strong>.
            </p>
          </div>

          {/* Phased Roadmap Timeline */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Development Phases
            </h4>

            <div className="space-y-3">
              {phases.map((p) => {
                const isCompleted = p.status === 'completed';
                const isNext = p.status === 'next';

                return (
                  <div
                    key={p.phase}
                    className={`rounded-lg p-3.5 border transition ${
                      isCompleted
                        ? 'bg-slate-950/80 border-cyan-900/60'
                        : isNext
                        ? 'bg-slate-900 border-amber-600/40'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isNext ? (
                          <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                        <span className="font-semibold text-slate-200 text-xs">
                          Phase {p.phase}: {p.title}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isNext
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isCompleted ? 'Built & Live' : isNext ? 'Ready for Build' : 'Planned'}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px] mb-2">{p.summary}</p>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
                      {p.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-cyan-500">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
