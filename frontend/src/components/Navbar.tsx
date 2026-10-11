import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Layers, Sparkles, AlertTriangle, FileCheck, Download, Database, GitBranch,
  MoreHorizontal, Activity, Wand2, RotateCcw,
} from 'lucide-react';
import { PanelButton } from './PanelButton';
import type { HL7Sample } from '../types/hl7';

type Mode = 'structural' | 'semantic' | 'resolution' | 'validation';

interface NavbarProps {
  backendOnline: boolean;
  totalSegments: number;
  messageType?: string;
  activeMode: Mode;
  unresolvedAmbiguitiesCount: number;
  conformanceScore?: number;
  canExport?: boolean;
  rulesCount?: number;
  samples?: HL7Sample[];
  selectedSampleId?: string;
  onSelectSample?: (s: HL7Sample) => void;
  onToggleMode: (mode: Mode) => void;
  onOpenHowItWorks: () => void;
  onOpenExport: () => void;
  onOpenRulesModal: () => void;
  onOpenUserGuide: () => void;
  onOpenEngineModal?: () => void;
  onOpenBatchModal?: () => void;
  onStartTour?: () => void;
  onGenerateSynthetic?: () => void;
  onResetToDefault?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendOnline, totalSegments, messageType, activeMode, unresolvedAmbiguitiesCount, conformanceScore,
  canExport = false, rulesCount = 0, samples = [], selectedSampleId, onSelectSample,
  onToggleMode, onOpenHowItWorks, onOpenExport, onOpenRulesModal, onOpenUserGuide, onOpenEngineModal, onOpenBatchModal,
  onStartTour, onGenerateSynthetic, onResetToDefault,
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!toolsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !toolsRef.current?.contains(event.target)) setToolsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setToolsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [toolsOpen]);

  const openTool = (action: () => void) => {
    setToolsOpen(false);
    action();
  };
  const tab = (mode: Mode, icon: React.ReactNode, label: string, extra?: React.ReactNode) => (
    <PanelButton onClick={() => onToggleMode(mode)} aria-pressed={activeMode === mode} className="navbar-tab">
      {icon}<span>{label}</span>{extra}
    </PanelButton>
  );

  return (
    <header className="navbar-shell sticky top-0 z-30">
      <div className="navbar-row max-w-7xl mx-auto">
        <div className="navbar-brand flex items-center gap-2.5 min-w-0">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="w-8 h-8 shrink-0" />
          <div>
            <div className="font-semibold text-panel-text leading-tight">SemantiCare</div>
            <div className="text-[10px] text-panel-muted leading-tight">HL7 v2 → FHIR R4</div>
          </div>
        </div>
        <nav className="navbar-views flex items-center gap-0.5" aria-label="Workbench views">
          {tab('structural', <Layers className="w-3.5 h-3.5" />, 'Structure')}
          {tab('resolution', <AlertTriangle className="w-3.5 h-3.5" />, 'Review',
            unresolvedAmbiguitiesCount > 0 && <span className="navbar-count text-panel-warning">{unresolvedAmbiguitiesCount}</span>)}
          {tab('semantic', <Sparkles className="w-3.5 h-3.5" />, 'FHIR R4')}
          {tab('validation', <FileCheck className="w-3.5 h-3.5" />, 'Validation',
            conformanceScore !== undefined && <span className="navbar-count text-panel-safe">{conformanceScore}%</span>)}
        </nav>
        <div className="navbar-actions flex items-center gap-2 min-w-0">
          {onStartTour && (
            <PanelButton
              onClick={onStartTour}
              className="hidden md:inline-flex text-panel-accent hover:bg-sky-50"
              title="Start Interactive Guided Demo and Clinical Walkthrough"
              aria-label="Start Guided Demo"
            >
              <Sparkles className="w-3.5 h-3.5 text-panel-accent" />
              <span>Guided Demo</span>
            </PanelButton>
          )}
          {samples.length > 0 && (
            <select
              aria-label="Clinical scenario"
              className="navbar-scenario"
              value={samples.some(s => s.id === selectedSampleId) ? selectedSampleId : ''}
              title={samples.find(s => s.id === selectedSampleId)?.description || 'Clinical scenario'}
              onChange={event => {
                const val = event.target.value;
                if (val === '__START_TOUR__') {
                  onStartTour?.();
                } else if (val === '__GENERATE_SYNTHETIC__') {
                  onGenerateSynthetic?.();
                } else if (val === '__RESET__') {
                  onResetToDefault?.();
                } else {
                  const sample = samples.find(s => s.id === val);
                  if (sample) onSelectSample?.(sample);
                }
              }}
            >
              <option value="" disabled>Clinical scenario</option>
              <optgroup label="Interactive Walkthrough">
                <option value="__START_TOUR__">✨ Start Guided Demo...</option>
                <option value="__GENERATE_SYNTHETIC__">🎲 Generate New Synthetic Case...</option>
                {onResetToDefault && <option value="__RESET__">↺ Reset to Default Scenario</option>}
              </optgroup>
              <optgroup label="Curated Clinical Scenarios">
                {samples.map(sample => <option key={sample.id} value={sample.id}>{sample.title}</option>)}
              </optgroup>
            </select>
          )}
          <div className="relative" ref={toolsRef}>
            <PanelButton ref={triggerRef} iconOnly aria-label="More tools" title="More tools" aria-expanded={toolsOpen} aria-controls="navbar-tools" onClick={() => setToolsOpen(!toolsOpen)}>
              <MoreHorizontal className="w-4 h-4" />
            </PanelButton>
            {toolsOpen && (
              <div id="navbar-tools" className="navbar-tools" onBlur={event => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setToolsOpen(false);
              }}>
                {onStartTour && <PanelButton onClick={() => openTool(onStartTour)}><Sparkles className="w-4 h-4 text-panel-accent" />Guided Demo</PanelButton>}
                {onGenerateSynthetic && <PanelButton onClick={() => openTool(onGenerateSynthetic)}><Wand2 className="w-4 h-4" />Generate Case</PanelButton>}
                {onResetToDefault && <PanelButton onClick={() => openTool(onResetToDefault)}><RotateCcw className="w-4 h-4" />Reset Workspace</PanelButton>}
                {onOpenBatchModal && <PanelButton onClick={() => openTool(onOpenBatchModal)}><Layers className="w-4 h-4" />Batch Studio</PanelButton>}
                <PanelButton onClick={() => openTool(onOpenRulesModal)}><Database className="w-4 h-4" />Memory{rulesCount > 0 && <span className="ml-auto font-mono text-[11px]">{rulesCount}</span>}</PanelButton>
                <PanelButton onClick={() => openTool(onOpenUserGuide)}><BookOpen className="w-4 h-4" />User guide</PanelButton>
                <PanelButton onClick={() => openTool(onOpenHowItWorks)}><GitBranch className="w-4 h-4" />Roadmap</PanelButton>
                {onOpenEngineModal && <PanelButton onClick={() => openTool(onOpenEngineModal)}><Activity className="w-4 h-4" />{backendOnline ? 'FastAPI Engine' : 'Browser Engine'}</PanelButton>}
                {messageType && <div className="navbar-engine-detail">{messageType} · {totalSegments} segments</div>}
              </div>
            )}
          </div>
          <PanelButton onClick={onOpenExport} disabled={!canExport} className="navbar-export" title={canExport ? 'Export FHIR Bundle or NDJSON' : 'Map a message to FHIR first'}>
            <Download className="w-3.5 h-3.5" />Export
          </PanelButton>
        </div>
      </div>
    </header>
  );
};
