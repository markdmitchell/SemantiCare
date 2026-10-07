import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Search,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Layers,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Activity
} from 'lucide-react';

interface UserGuideModalProps {
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'quickstart' | 'workflow' | 'scenarios' | 'faqs'>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'quickstart', label: 'Platform & UI Tour', icon: Layers },
    { id: 'workflow', label: '10-Step Workflow', icon: Sparkles },
    { id: 'scenarios', label: 'Clinical Scenarios', icon: Activity },
    { id: 'faqs', label: 'Best Practices & FAQs', icon: ShieldCheck },
  ];

  const handleOpenGitHub = () => {
    window.open('https://github.com/markdmitchell/semanticare/blob/main/docs/USER_GUIDE.md', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">SemantiCare Clinical Informaticist & User Guide</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v1.1 Complete
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-end guidance for translating legacy HL7 v2 feeds into standardized FHIR R4 resources.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenGitHub}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Open full markdown documentation on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View on GitHub</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search guide topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-xs leading-relaxed">
          {/* Section 1: Quickstart & UI Tour */}
          {activeSection === 'quickstart' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>The SemantiCare Architecture at a Glance</span>
                </div>
                <p>
                  SemantiCare bridges legacy hospital EHR feeds (HL7 v2.3, v2.5, v2.5.1) and modern FHIR R4 interoperability standards. Unlike generic LLM translation pipelines that hallucinate medical codes or violate HIPAA, SemantiCare employs deterministic grammars, local zero-trust token vaults, and verified terminology ontologies.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="font-semibold text-white block">1. Zero-Trust Security</span>
                    <p className="text-slate-400 text-[11px]">
                      Patient identifiers are scrubbed locally in-memory into cryptographic surrogate tokens before semantic processing.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="font-semibold text-white block">2. Grounded Ontologies</span>
                    <p className="text-slate-400 text-[11px]">
                      Local hospital test codes are grounded to deterministic LOINC catalogs and standardized UCUM units.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="font-semibold text-white block">3. Institutional Memory</span>
                    <p className="text-slate-400 text-[11px]">
                      Informaticist ambiguity decisions are saved to a persistent SQLite rulebase, auto-resolving future feeds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">4 Studio Perspectives</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                      <Layers className="w-4 h-4" />
                      <span>1. Structural AST Viewer</span>
                    </div>
                    <p className="text-slate-400">
                      Deconstructs raw messages into their Abstract Syntax Tree (Segments, Fields, Repetitions, and Components). Annotates HL7 data types (XPN, CX, CWE, NM, TS) and detects proprietary hospital Z-segments.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>2. Resolution Deck (HITL)</span>
                    </div>
                    <p className="text-slate-400">
                      Surfaces unresolved clinical ambiguities (missing UCUM units, ungrounded local codes, compound blood pressure) for informaticist review with 1-click persistent memory persistence.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>3. FHIR R4 Studio Viewer</span>
                    </div>
                    <p className="text-slate-400">
                      Interactive visual cards for all generated FHIR resources (Patient, Encounter, Observation, DiagnosticReport, Condition, Coverage) with confidence meters and in-browser Monaco JSON editing.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400 font-semibold">
                      <FileCheck className="w-4 h-4" />
                      <span>4. Validation Inspector</span>
                    </div>
                    <p className="text-slate-400">
                      Real-time conformance scoring against US Core 3.1.1 and HL7 Base R4 schemas with JSON path pinpointing, referential integrity verification, and issue severity breakdowns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: 10-Step Workflow */}
          {activeSection === 'workflow' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-white text-sm">Step-by-Step Production Workflow</span>
                <span className="text-[11px] text-slate-500">From Raw Ingestion to Production FHIR Store</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    num: '01',
                    title: 'Message Ingestion & Delimiter Analysis',
                    desc: 'Paste any HL7 v2 string or select a curated scenario. SemantiCare automatically normalizes CRLF/LF line endings and dynamically extracts header delimiters (| ^ ~ \\ &).',
                  },
                  {
                    num: '02',
                    title: 'Zero-Trust PHI De-Identification',
                    desc: 'Patient identifiers (Names, MRNs, DOBs, Addresses, SSNs) are replaced with synthetic cryptographic tokens. Inspect the token vault via the PHI Audit Drawer.',
                  },
                  {
                    num: '03',
                    title: 'AST Structural Decomposition',
                    desc: 'Review segment hierarchy, 1-indexed field chips, repetitions, and standard HL7 v2 data types in the Structural AST perspective.',
                  },
                  {
                    num: '04',
                    title: 'Semantic Mapping & Ontology Grounding',
                    desc: 'Translates records into standard FHIR R4 resources. Local test codes are grounded to LOINC (Top-Lab 2000) and units are normalized to UCUM.',
                  },
                  {
                    num: '05',
                    title: 'Clinical NLP Entity Extraction (NTE Comments)',
                    desc: 'Physician and pathologist narrative notes in NTE segments are parsed into structured Condition (ICD-10-CM), AllergyIntolerance (RxNorm), and ServiceRequest resources.',
                  },
                  {
                    num: '06',
                    title: 'Human-in-the-Loop (HITL) Resolution Deck',
                    desc: 'Resolve flagged ambiguities (e.g. confirming kg vs lbs on scale readings). Selecting options updates the FHIR bundle and boosts confidence to 100%.',
                  },
                  {
                    num: '07',
                    title: 'Institutional Mapping Memory Commitment',
                    desc: 'Check "Remember in Mapping Memory for [Facility]" when resolving cards. Future messages from that facility auto-resolve immediately.',
                  },
                  {
                    num: '08',
                    title: 'US Core 3.1.1 Conformance Validation',
                    desc: 'Toggle between US Core 3.1.1 and Base R4 to inspect conformance scores and check mandatory elements, UCUM syntax, and reference links.',
                  },
                  {
                    num: '09',
                    title: 'Monaco JSON Code Editing & Live Mutation',
                    desc: 'Inspect or manually tweak the transaction bundle directly in VS Code Monaco editor with live auto-indent and real-time re-validation.',
                  },
                  {
                    num: '10',
                    title: 'Dual-Flavor Export & FHIR Server Push',
                    desc: 'Export as De-Identified or Re-Hydrated bundles (JSON or Bulk NDJSON), or transmit directly to live HAPI FHIR, Google Cloud Healthcare, or AWS HealthLake endpoints.',
                  },
                ].map((step) => (
                  <div key={step.num} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                    <span className="font-mono text-cyan-400 font-bold text-sm bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      {step.num}
                    </span>
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200 text-xs">{step.title}</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Clinical Scenarios */}
          {activeSection === 'scenarios' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <span className="font-semibold text-white text-sm block pb-2 border-b border-slate-800">
                5 Curated Clinical Scenarios
              </span>

              <div className="space-y-3">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-300">1. ADT^A01 - Inpatient Hospital Admission</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                      ADT_A01
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Adult female admitted to medical-surgical unit. Generates FHIR Patient, Encounter (Inpatient), Condition (Bacterial pneumonia, ICD-10 J18.9), and Coverage (commercial payer). Tests next-of-kin contacts, attending physician NPIs, and admission status.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300">2. ORU^R01 - Comprehensive Metabolic & CBC Lab Results</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                      ORU_R01
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Outpatient blood panel from chemistry analyzer. Maps glucose, sodium, potassium, BUN, and creatinine to LOINC Top-Lab codes with reference ranges and abnormal flags (H/L). Extracts provisional hyperglycemia Condition and HbA1c screening ServiceRequest from NTE notes.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300">3. ORU^R01 - Vital Signs with Semantic Ambiguities</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                      HITL Showcase
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    ICU bedside monitor flow sheet containing messy real-world data: compound blood pressure string "138/88" (decomposed into systolic & diastolic), Fahrenheit temperature, and empty unit on body weight (82.5). Demonstrates interactive card resolution and Mapping Memory auto-learning.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-300">4. ORU^R01 - Radiology Order with Proprietary Z-Segments</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-mono">
                      Custom Extensions
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Chest X-Ray study from hospital PACS containing proprietary ZDS (DICOM Study UID, Modality CR) and ZTR (Patient Transport Wheelchair mode) segments. Demonstrates how SemantiCare maps site-specific segments into structured FHIR extensions.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300">5. ADT^A08 - Cardiology Visit with Dual Diagnoses</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-mono">
                      Outpatient Clinic
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Cardiology consultation with dual ICD-10 diagnoses (Coronary artery disease I25.10 & Essential hypertension I10) and Aetna coverage. Extracts follow-up echocardiogram ServiceRequest from cardiologist impressions in NTE comments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Best Practices & FAQs */}
          {activeSection === 'faqs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <span className="font-semibold text-white text-sm block pb-2 border-b border-slate-800">
                Informaticist Best Practices & FAQs
              </span>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <span className="font-semibold text-slate-200">Q: Why is my message confidence score below 100%?</span>
                  <p className="text-slate-400 text-[11px]">
                    A score below 100% indicates that the message contains unverified semantic elements (such as missing units or ungrounded codes). Open the Resolution Deck, pick the clinical resolution, and your score will increase to 100%.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <span className="font-semibold text-slate-200">Q: Can SemantiCare run completely offline in an air-gapped intranet?</span>
                  <p className="text-slate-400 text-[11px]">
                    Yes! SemantiCare uses local embedded dictionary engines (LOINC Top-Lab, UCUM validators, SQLite rulebase, and local Pydantic models). It requires zero external cloud API calls for mapping, translation, or validation.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <span className="font-semibold text-slate-200">Q: How do facility-specific rules match incoming messages?</span>
                  <p className="text-slate-400 text-[11px]">
                    The engine checks MSH-4 (Sending Facility) and MSH-6 (Receiving Facility). It first looks for a facility-specific rule, then falls back to global wildcard (*) rules. Rules can be exported as standard FHIR ConceptMap JSON.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <span className="font-semibold text-slate-200">Q: How do I export rules to our hospital EHR or integration engine?</span>
                  <p className="text-slate-400 text-[11px]">
                    Click the "Memory" button in the top navbar, then click "Export ConceptMap". This downloads a standard HL7 FHIR R4 ConceptMap JSON resource ready for ingestion by Mirth Connect, Rhapsody, or your EHR terminology service.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SemantiCare Documentation Suite • Synced with GitHub</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
