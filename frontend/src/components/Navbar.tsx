import React from 'react';
import {
  Activity,
  Cpu,
  BookOpen,
  Layers,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Download,
  Database,
  GitBranch,
} from 'lucide-react';

interface NavbarProps {
  backendOnline: boolean;
  totalSegments: number;
  messageType?: string;
  activeMode: 'structural' | 'semantic' | 'resolution' | 'validation';
  unresolvedAmbiguitiesCount: number;
  conformanceScore?: number;
  canExport?: boolean;
  rulesCount?: number;
  onToggleMode: (mode: 'structural' | 'semantic' | 'resolution' | 'validation') => void;
  onOpenHowItWorks: () => void;
  onOpenExport: () => void;
  onOpenRulesModal: () => void;
  onOpenUserGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendOnline,
  totalSegments,
  messageType,
  activeMode,
  unresolvedAmbiguitiesCount,
  conformanceScore,
  canExport = false,
  rulesCount = 0,
  onToggleMode,
  onOpenHowItWorks,
  onOpenExport,
  onOpenRulesModal,
  onOpenUserGuide,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-5 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-amber-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">SemantiCare</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                Production Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Assisted Semantic Data Mapper • HL7 v2 to FHIR R4</p>
          </div>
        </div>

        {/* Center: 4-way Studio View Switcher */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onToggleMode('structural')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeMode === 'structural'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Structural AST</span>
          </button>

          <button
            onClick={() => onToggleMode('resolution')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition relative ${
              activeMode === 'resolution'
                ? 'bg-amber-950 text-amber-200 border border-amber-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Resolution Deck</span>
            {unresolvedAmbiguitiesCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {unresolvedAmbiguitiesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onToggleMode('semantic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeMode === 'semantic'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>FHIR R4 Studio</span>
          </button>

          <button
            onClick={() => onToggleMode('validation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeMode === 'validation'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Validation</span>
            {conformanceScore !== undefined && (
              <span className="text-[10px] font-mono text-emerald-300">
                {conformanceScore}%
              </span>
            )}
          </button>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Export Bundle Button */}
          <button
            onClick={onOpenExport}
            disabled={!canExport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium shadow-md transition active:scale-[0.98] ${
              canExport
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
            }`}
            title={canExport ? "Export FHIR Bundle or NDJSON" : "Map a message to FHIR first to enable export"}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {messageType && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{messageType} ({totalSegments} segs)</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-800/80 border border-slate-700/80">
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-medium hidden sm:inline">
              FastAPI {backendOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <button
            onClick={onOpenRulesModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Manage Institutional Mapping Memory & Rulebase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Memory</span>
            {rulesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                {rulesCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenUserGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Open Clinical Informaticist & User Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          <button
            onClick={onOpenHowItWorks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Roadmap</span>
          </button>
        </div>
      </div>
    </header>
  );
};
