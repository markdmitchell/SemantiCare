import React from 'react';
import {
  BookOpen, Layers, Sparkles, AlertTriangle, FileCheck, Download, Database, GitBranch,
  FileText, FlaskConical,
} from 'lucide-react';
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
}

const sampleIcon = (category: string) => {
  if (category.startsWith('Demographics')) return <FileText className="w-3.5 h-3.5" />;
  if (category.startsWith('Diagnostic')) return <FlaskConical className="w-3.5 h-3.5" />;
  if (category.startsWith('Ambiguity')) return <AlertTriangle className="w-3.5 h-3.5" />;
  if (category.startsWith('Custom')) return <Layers className="w-3.5 h-3.5" />;
  return <Sparkles className="w-3.5 h-3.5" />;
};

export const Navbar: React.FC<NavbarProps> = ({
  backendOnline, totalSegments, messageType, activeMode, unresolvedAmbiguitiesCount, conformanceScore,
  canExport = false, rulesCount = 0, samples = [], selectedSampleId, onSelectSample,
  onToggleMode, onOpenHowItWorks, onOpenExport, onOpenRulesModal, onOpenUserGuide, onOpenEngineModal,
}) => {
  const tab = (mode: Mode, icon: React.ReactNode, label: string, extra?: React.ReactNode) => (
    <button
      onClick={() => onToggleMode(mode)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap cursor-pointer ${
        activeMode === mode ? 'bg-white text-sky-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}<span>{label}</span>{extra}
    </button>
  );
  const ghost = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      {/* Row 1 */}
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="w-9 h-9 shrink-0 shadow-sm rounded-xl" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 tracking-tight leading-tight">SemantiCare</div>
            <div className="text-[11px] text-slate-500 truncate">HL7 v2 → FHIR R4 clinical bridge</div>
          </div>
          <button
            onClick={onOpenEngineModal}
            className="hidden md:flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-600 transition cursor-pointer"
            title="Click to view engine telemetry, test backend connection, or switch engine modes"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-sky-500'}`} />
            <span className="font-semibold text-slate-700">
              {backendOnline ? 'FastAPI Engine' : 'Browser Engine'}
            </span>
            {messageType && <span className="text-slate-400">· {messageType} · {totalSegments} segs</span>}
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={onOpenRulesModal} className={ghost} title="Institutional mapping memory">
            <Database className="w-3.5 h-3.5" /><span className="hidden sm:inline">Memory</span>
            {rulesCount > 0 && <span className="px-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono font-bold">{rulesCount}</span>}
          </button>
          <button onClick={onOpenUserGuide} className={ghost}><BookOpen className="w-3.5 h-3.5" /><span className="hidden sm:inline">Guide</span></button>
          <button onClick={onOpenHowItWorks} className={ghost}><GitBranch className="w-3.5 h-3.5" /><span className="hidden sm:inline">Roadmap</span></button>
          <button
            onClick={onOpenExport}
            disabled={!canExport}
            className={`ml-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition ${
              canExport ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            title={canExport ? 'Export FHIR Bundle or NDJSON' : 'Map a message to FHIR first'}
          >
            <Download className="w-3.5 h-3.5" />Export
          </button>
        </div>
      </div>

      {/* Row 2 */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 py-1.5 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg overflow-x-auto">
            {tab('structural', <Layers className="w-3.5 h-3.5" />, 'Structure')}
            {tab('resolution', <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />, 'Review',
              unresolvedAmbiguitiesCount > 0 && <span className="px-1.5 rounded-full bg-amber-500 text-white font-bold text-[10px]">{unresolvedAmbiguitiesCount}</span>)}
            {tab('semantic', <Sparkles className="w-3.5 h-3.5 text-sky-600" />, 'FHIR R4')}
            {tab('validation', <FileCheck className="w-3.5 h-3.5 text-emerald-600" />, 'Validation',
              conformanceScore !== undefined && <span className="text-[10px] font-mono text-emerald-700">{conformanceScore}%</span>)}
          </nav>
          {samples.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
              <span className="hidden lg:inline text-[11px] font-medium text-slate-400 uppercase tracking-wider mr-1">Scenarios</span>
              {samples.map((s) => {
                const sel = s.id === selectedSampleId;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSample?.(s)}
                    title={s.description}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap border transition cursor-pointer ${
                      sel ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {sampleIcon(s.category)}{s.title.split(' - ')[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
