import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  CheckCircle2,
  Wand2,
  Workflow,
  AlertTriangle,
  Download,
  RotateCcw,
} from 'lucide-react';
import { PanelButton } from './PanelButton';
import type { SyntheticPreset } from '../engine/syntheticGenerator';

export interface GuidedTourStep {
  id: number;
  title: string;
  subtitle: string;
  targetMode: 'structural' | 'semantic' | 'resolution' | 'validation';
  description: string;
  insights: string[];
  actionLabel?: string;
  actionIcon?: React.ReactNode;
}

const TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 1,
    title: 'Clinical Ingestion & Structural Linting',
    subtitle: 'HL7 v2.x Delimiter Detection & Conformance Auditing',
    targetMode: 'structural',
    description:
      'SemantiCare ingests clinical feeds with automatic delimiter parsing (| ^ ~ \\ &). The built-in HL7 linter audits required headers, patient identifiers, and UCUM units in real time, computing a quantitative Quality Score.',
    insights: [
      'Segment topology ribbon displays real-time sequence (MSH -> PID -> PV1 -> OBX)',
      'Deterministic AST parser handles any line break convention (CR, LF, CRLF)',
      'Actionable recommendations flag missing delimiters or non-standard fields',
    ],
    actionLabel: 'Format & Re-lint',
    actionIcon: <Wand2 className="w-3.5 h-3.5" />,
  },
  {
    id: 2,
    title: 'EHR Patient Banner & Zero-Trust Token Vault',
    subtitle: 'Reversible In-Memory De-Identification',
    targetMode: 'structural',
    description:
      'Before clinical data touches semantic mappers or external models, protected health information (names, MRNs, dates of birth, addresses, phones) is redacted into cryptographic surrogate tokens. The ephemeral in-memory vault allows authorized local rehydration without network leakage.',
    insights: [
      'Zero PHI is transmitted across network boundaries in de-identified mode',
      'Local token vault allows 1-click reversible rehydration for authorized EHR display',
      'Integrated patient header shows live clinical demographics and encounter class',
    ],
    actionLabel: 'Toggle PHI Protection',
    actionIcon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  {
    id: 3,
    title: 'Human-in-the-Loop Ambiguity Resolution',
    subtitle: 'Clinical Informaticist Review & Institutional Memory',
    targetMode: 'resolution',
    description:
      'Hospital feeds frequently contain missing units (e.g. weight without kg/lb) or local test codes (BP_LOCAL). SemantiCare flags these as clinical ambiguities instead of making unsafe guesses, giving informaticists 1-click candidate selection.',
    insights: [
      'Decomposes compound blood pressure vitals into systolic and diastolic components',
      'Ranks grounded LOINC candidates with confidence scoring percentages',
      'Saves informaticist decisions to persistent Institutional Memory, auto-resolving future feeds',
    ],
    actionLabel: 'Auto-Resolve Ambiguities',
    actionIcon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  {
    id: 4,
    title: 'Semantic FHIR R4 Bundle Studio',
    subtitle: 'Resource Cards, Monaco JSON, Token Diff & Provenance Tree',
    targetMode: 'semantic',
    description:
      'The semantic mapper outputs a fully linked FHIR R4 transaction bundle containing Patient, Encounter, Observation, Condition, and ServiceRequest resources. Unstructured physician comments are extracted by Clinical NLP into structured conditions and care orders.',
    insights: [
      'Visual Cards offer accessible inspections with confidence badges',
      'Token Diff compares de-identified tokens against re-hydrated PHI side-by-side',
      'Provenance Tree maps the hierarchical DAG linking Patient -> Encounter -> Observations',
    ],
    actionLabel: 'View Provenance Tree',
    actionIcon: <Workflow className="w-3.5 h-3.5" />,
  },
  {
    id: 5,
    title: 'US Core 3.1.1 Conformance & Bulk Export',
    subtitle: 'Rule-by-Rule Inspector, NDJSON & FHIR Store Gateway',
    targetMode: 'validation',
    description:
      'Every bundle is verified against official US Core 3.1.1 profiles and HL7 Base R4 schemas. Verified bundles can be downloaded as standard JSON, streamed as Bulk FHIR NDJSON for data lakes, or transmitted directly to live FHIR repositories (HAPI, Cloud Healthcare, AWS HealthLake).',
    insights: [
      '100% US Core conformance with zero schema violations on validated scenarios',
      'Bulk NDJSON export formats one resource per line for BigQuery and analytics pipelines',
      'Pre-generated copy-ready developer code in cURL, Python, and TypeScript',
    ],
    actionLabel: 'Open Export Studio',
    actionIcon: <Download className="w-3.5 h-3.5" />,
  },
];

export interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: 'structural' | 'semantic' | 'resolution' | 'validation';
  onSelectMode: (mode: 'structural' | 'semantic' | 'resolution' | 'validation') => void;
  phiScrubbingEnabled: boolean;
  onTogglePhiScrubbing: (enabled: boolean) => void;
  onLoadSyntheticCase: (preset: SyntheticPreset) => void;
  onResolveAmbiguitiesDemo?: () => void;
  onOpenExportModal?: () => void;
  conformanceScore?: number;
  unresolvedAmbiguitiesCount: number;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  onClose,
  activeMode,
  onSelectMode,
  phiScrubbingEnabled,
  onTogglePhiScrubbing,
  onLoadSyntheticCase,
  onResolveAmbiguitiesDemo,
  onOpenExportModal,
  conformanceScore,
  unresolvedAmbiguitiesCount,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySecondsLeft, setAutoPlaySecondsLeft] = useState(10);
  const [activePreset, setActivePreset] = useState<SyntheticPreset>('golden_walkthrough');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Auto-align workbench view with current tour step
  useEffect(() => {
    if (!isOpen) return;
    if (activeMode !== step.targetMode) {
      onSelectMode(step.targetMode);
    }
  }, [isOpen, currentStepIndex, step.targetMode]);

  // Handle auto-advance timer
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setAutoPlaySecondsLeft(10);
    timerRef.current = setInterval(() => {
      setAutoPlaySecondsLeft((prev) => {
        if (prev <= 1) {
          // Advance to next step
          setCurrentStepIndex((curr) => {
            if (curr >= TOUR_STEPS.length - 1) {
              setIsAutoPlaying(false);
              return curr;
            }
            return curr + 1;
          });
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isAutoPlaying, currentStepIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepAction = () => {
    if (step.id === 1) {
      // Step 1: Re-load/re-lint synthetic case
      onLoadSyntheticCase(activePreset);
      onSelectMode('structural');
    } else if (step.id === 2) {
      // Step 2: Toggle PHI protection
      onTogglePhiScrubbing(!phiScrubbingEnabled);
    } else if (step.id === 3) {
      // Step 3: Auto-resolve ambiguities in HITL review
      if (onResolveAmbiguitiesDemo) {
        onResolveAmbiguitiesDemo();
      }
      onSelectMode('resolution');
    } else if (step.id === 4) {
      // Step 4: Switch to semantic view
      onSelectMode('semantic');
    } else if (step.id === 5) {
      // Step 5: Open export modal
      if (onOpenExportModal) {
        onOpenExportModal();
      } else {
        onSelectMode('validation');
      }
    }
  };

  const handlePresetChange = (preset: SyntheticPreset) => {
    setActivePreset(preset);
    onLoadSyntheticCase(preset);
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    onLoadSyntheticCase('golden_walkthrough');
    setActivePreset('golden_walkthrough');
    onSelectMode('structural');
    setIsAutoPlaying(false);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-3 sm:px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-4 sm:p-5 space-y-3.5 text-slate-800 ring-1 ring-slate-900/5">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-900">
                  Interactive Guided Demo
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Step {step.id} of {TOUR_STEPS.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Preset Selector & Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={activePreset}
              onChange={(e) => handlePresetChange(e.target.value as SyntheticPreset)}
              className="text-xs h-7 px-2 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
              title="Switch demo clinical message preset"
            >
              <option value="golden_walkthrough">Golden Walkthrough</option>
              <option value="cardiology">Cardiology Admission (ADT)</option>
              <option value="critical_lab">Critical Panic Labs (ORU)</option>
              <option value="hitl_showcase">HITL Ambiguity Showcase</option>
            </select>

            <PanelButton
              iconOnly
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              title={isAutoPlaying ? `Auto-play active (${autoPlaySecondsLeft}s left). Click to pause.` : 'Start auto-play walkthrough (10s per step)'}
              aria-label="Toggle auto-play"
              className={isAutoPlaying ? 'bg-sky-50 border-sky-200 text-sky-700' : ''}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </PanelButton>

            <PanelButton
              iconOnly
              onClick={onClose}
              title="Close walkthrough"
              aria-label="Close guided demo"
            >
              <X className="w-3.5 h-3.5" />
            </PanelButton>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1.5 w-full">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex
                  ? 'flex-1 bg-sky-600'
                  : idx < currentStepIndex
                  ? 'w-8 bg-sky-300'
                  : 'w-4 bg-slate-200 hover:bg-slate-300'
              }`}
              title={`Jump to Step ${s.id}: ${s.title}`}
              aria-label={`Jump to Step ${s.id}`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 leading-snug">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {step.description}
              </p>
            </div>

            {/* Quick Context Metric Badges */}
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 font-mono text-[10px]">
              {step.id === 2 && (
                <span className={`px-2 py-0.5 rounded border ${phiScrubbingEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                  {phiScrubbingEnabled ? 'PHI Tokens Protected' : 'Re-Hydrated Identity'}
                </span>
              )}
              {step.id === 3 && (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  {unresolvedAmbiguitiesCount} Ambiguities Flagged
                </span>
              )}
              {step.id >= 4 && conformanceScore !== undefined && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {conformanceScore}% US Core Match
                </span>
              )}
            </div>
          </div>

          {/* Bulleted Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
            {step.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation & Interactive Action */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-2">
            <PanelButton
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              title="Previous step"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </PanelButton>

            <PanelButton
              onClick={handleRestart}
              title="Restart walkthrough from Step 1"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Restart</span>
            </PanelButton>
          </div>

          <div className="flex items-center gap-2">
            {step.actionLabel && (
              <button
                type="button"
                onClick={handleStepAction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs shadow-2xs transition active:scale-[0.98] cursor-pointer"
                title={`Perform interactive action: ${step.actionLabel}`}
              >
                {step.actionIcon}
                <span>{step.actionLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-sky-700 hover:bg-sky-600 text-white font-medium text-xs shadow-sm transition active:scale-[0.98] cursor-pointer"
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
