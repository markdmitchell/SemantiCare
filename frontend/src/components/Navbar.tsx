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
  hasContent?: boolean;
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
  onClearToBlank?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendOnline, totalSegments, messageType, activeMode, unresolvedAmbiguitiesCount, conformanceScore,
  canExport = false, hasContent = false, rulesCount = 0, samples = [], selectedSampleId, onSelectSample,
  onToggleMode, onOpenHowItWorks, onOpenExport, onOpenRulesModal, onOpenUserGuide, onOpenEngineModal, onOpenBatchModal,
  onStartTour, onGenerateSynthetic, onResetToDefault, onClearToBlank,
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);

  const focusItem = (index: number) => {
    const items = menuItems();
    if (items.length) items[(index + items.length) % items.length].focus();
  };

  const openMenu = (focus: 'first' | 'last' = 'first') => {
    setToolsOpen(true);
    requestAnimationFrame(() => focusItem(focus === 'first' ? 0 : menuItems().length - 1));
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toolsOpen ? focusItem(0) : openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      toolsOpen ? focusItem(menuItems().length - 1) : openMenu('last');
    }
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); focusItem(index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusItem(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusItem(0); }
    else if (event.key === 'End') { event.preventDefault(); focusItem(items.length - 1); }
    else if (event.key === 'Tab') { setToolsOpen(false); }
  };

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
              aria-label="Load workspace"
              className="navbar-scenario"
              value={samples.some(s => s.id === selectedSampleId) ? selectedSampleId : selectedSampleId ? '' : '__BLANK__'}
              title={samples.find(s => s.id === selectedSampleId)?.description || (selectedSampleId ? 'Active clinical scenario' : 'Load workspace')}
              onChange={event => {
                const val = event.target.value;
                if (val === '__GENERATE_SYNTHETIC__') {
                  onGenerateSynthetic?.();
                } else if (val === '__RESET__' || val === '__BLANK__') {
                  if (onClearToBlank) onClearToBlank();
                  else onResetToDefault?.();
                } else {
                  const sample = samples.find(s => s.id === val);
                  if (sample) onSelectSample?.(sample);
                }
              }}
            >
              <option value="" disabled>Load workspace...</option>
              <optgroup label="Workspace">
                <option value="__BLANK__">📄 Blank Workspace (Custom HL7)</option>
              </optgroup>
              <optgroup label="Curated Clinical Scenarios">
                {samples.map(sample => (
                  <option key={sample.id} value={sample.id}>
                    Load: {sample.title}
                  </option>
                ))}
              </optgroup>
              {onGenerateSynthetic && (
                <optgroup label="On-The-Fly Synthesis">
                  <option value="__GENERATE_SYNTHETIC__">🎲 Generate Random Synthetic Case...</option>
                </optgroup>
              )}
            </select>
          )}
          {(onClearToBlank || onResetToDefault) && (
            <PanelButton
              onClick={() => {
                if (onClearToBlank) onClearToBlank();
                else onResetToDefault?.();
              }}
              disabled={!hasContent}
              className="navbar-reset"
              title={hasContent ? 'Reset workspace to clean blank state' : 'Workspace is clean'}
              aria-label="Reset workspace"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Reset Workspace</span>
              <span className="sm:hidden">Reset</span>
            </PanelButton>
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
                {(onClearToBlank || onResetToDefault) && (
                  <PanelButton onClick={() => openTool(onClearToBlank || onResetToDefault!)}>
                    <RotateCcw className="w-4 h-4" />
                    New Blank Workspace
                  </PanelButton>
                )}
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
