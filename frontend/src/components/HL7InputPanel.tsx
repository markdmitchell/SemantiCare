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
  const [showDelims, setShowDelims] = useState(false);

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
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-sky-600" />
          <h2 className="font-semibold text-sm text-slate-700">Clinical Message</h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
            {lineCount} {lineCount === 1 ? 'segment' : 'segments'} • {charCount} chars
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition border border-slate-200"
            title="Copy HL7 message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setRawHL7('')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-rose-50/60 hover:text-rose-700 text-slate-600 transition border border-slate-200 hover:border-rose-200"
            title="Clear text"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Active Sample Context Banner */}
      {activeSample && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sky-700">{activeSample.title}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{activeSample.description}</p>
            </div>
          </div>
          {activeSample.highlights && activeSample.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeSample.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw HL7 Input Area */}
      <div className="relative flex-1 p-2 bg-slate-50 flex flex-col">
        <textarea
          value={rawHL7}
          onChange={(e) => setRawHL7(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste raw HL7 v2 message here (e.g. MSH|^~\&|...)... or select a clinical scenario above."
          className="w-full flex-1 p-3 font-mono text-xs text-slate-700 bg-white/90 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 outline-none resize-none leading-relaxed selection:bg-sky-100 selection:text-sky-800"
          spellCheck={false}
        />
      </div>

      {/* PHI Security Guardrail Setting Bar */}
      <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={phiScrubbingEnabled}
            onChange={(e) => setPhiScrubbingEnabled(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-100 border-slate-200 text-emerald-500 focus:ring-0"
          />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-600 font-medium">Protect patient information (PHI)</span>
        </label>
        <span className="text-[10px] text-slate-500">Hidden before processing</span>
      </div>

      {/* Footer Bar with Delimiter Badges and Action Buttons */}
      <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <button onClick={() => setShowDelims(!showDelims)} className="flex items-center gap-1 hover:text-sky-700" title="Show message separators">
            <Hash className="w-3.5 h-3.5" />
            <span>{showDelims ? 'Hide' : 'Show'} separators</span>
          </button>
          {showDelims && delimiters && (
            <div className="flex items-center gap-1 font-mono">
              {[['F', delimiters.field], ['C', delimiters.component], ['R', delimiters.repetition], ['E', delimiters.escape], ['S', delimiters.subcomponent]].map(([k, v]) => (
                <span key={k} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">{k}:{v}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Parse AST Button */}
          <button
            onClick={onParse}
            disabled={loading || mappingLoading || !rawHL7.trim()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-medium text-xs transition"
          >
            <Play className="w-3.5 h-3.5 text-sky-600" />
            <span>Structure only</span>
          </button>

          {/* Primary Map to FHIR Button */}
          <button
            onClick={onMapToFHIR}
            disabled={loading || mappingLoading || !rawHL7.trim()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 px-5 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs text-white shadow-md shadow-emerald-100/40 transition active:scale-[0.98]"
          >
            {mappingLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Processing…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Process Clinical Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
