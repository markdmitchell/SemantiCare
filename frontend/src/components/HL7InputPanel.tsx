import React, { useState } from 'react';
import type { HL7Delimiters, HL7Sample } from '../types/hl7';
import { Play, Copy, Trash2, Check, Code, Hash, Sparkles, ShieldCheck } from 'lucide-react';

interface HL7InputPanelProps {
  rawHL7: string;
  setRawHL7: (val: string) => void;
  onParse: () => void;
  onMapToFHIR: () => void;
  loading: boolean;
  mappingLoading: boolean;
  phiScrubbingEnabled: boolean;
  setPhiScrubbingEnabled: (val: boolean) => void;
  delimiters?: HL7Delimiters;
  activeSample?: HL7Sample | null;
}

export const HL7InputPanel: React.FC<HL7InputPanelProps> = ({
  rawHL7,
  setRawHL7,
  onParse,
  onMapToFHIR,
  loading,
  mappingLoading,
  phiScrubbingEnabled,
  setPhiScrubbingEnabled,
  delimiters,
  activeSample,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawHL7);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = rawHL7.trim() ? rawHL7.trim().split(/\r\n|\r|\n/).length : 0;
  const charCount = rawHL7.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onMapToFHIR();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-sm text-slate-200">HL7 v2 Message Ingestion</h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {lineCount} {lineCount === 1 ? 'segment' : 'segments'} • {charCount} chars
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Copy HL7 message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setRawHL7('')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 transition border border-slate-700 hover:border-rose-800"
            title="Clear text"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Active Sample Context Banner */}
      {activeSample && (
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/80 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-cyan-300">{activeSample.title}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{activeSample.description}</p>
            </div>
          </div>
          {activeSample.highlights && activeSample.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeSample.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw HL7 Input Area */}
      <div className="relative flex-1 p-2 bg-slate-950 flex flex-col">
        <textarea
          value={rawHL7}
          onChange={(e) => setRawHL7(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste raw HL7 v2 message here (e.g. MSH|^~\&|...)... or select a clinical scenario above."
          className="w-full flex-1 p-3 font-mono text-xs text-slate-200 bg-slate-900/90 rounded-lg border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none leading-relaxed selection:bg-cyan-900 selection:text-cyan-100"
          spellCheck={false}
        />
      </div>

      {/* PHI Security Guardrail Setting Bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={phiScrubbingEnabled}
            onChange={(e) => setPhiScrubbingEnabled(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
          />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-medium">Pre-Flight Zero-Trust PHI Scrubber</span>
        </label>
        <span className="text-[10px] text-slate-500">Reversible Token Vault</span>
      </div>

      {/* Footer Bar with Delimiter Badges and Action Buttons */}
      <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Hash className="w-3.5 h-3.5 text-slate-500" />
          {delimiters ? (
            <div className="flex items-center gap-1 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300" title="Field Separator">
                F:{delimiters.field}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300" title="Component Separator">
                C:{delimiters.component}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300" title="Repetition Separator">
                R:{delimiters.repetition}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-300" title="Escape Character">
                E:{delimiters.escape}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-rose-300" title="Subcomponent Separator">
                S:{delimiters.subcomponent}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 italic">Auto-detected delimiters</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Parse AST Button */}
          <button
            onClick={onParse}
            disabled={loading || mappingLoading || !rawHL7.trim()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-medium text-xs transition"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parse Tree</span>
          </button>

          {/* Primary Map to FHIR Button */}
          <button
            onClick={onMapToFHIR}
            disabled={loading || mappingLoading || !rawHL7.trim()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs text-white shadow-md shadow-emerald-950/40 transition active:scale-[0.98]"
          >
            {mappingLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Mapping FHIR...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Map to FHIR R4</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
