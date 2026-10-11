import React, { useState, useRef, useMemo } from 'react';
import type { HL7Delimiters, HL7Sample } from '../types/hl7';
import { lintHL7Message } from '../engine/hl7Linter';
import { PanelButton } from './PanelButton';
import {
  Play,
  Copy,
  Trash2,
  Check,
  Code,
  Hash,
  Sparkles,
  ShieldCheck,
  Wand2,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  FileCode,
  Clipboard,
  Hospital,
} from 'lucide-react';

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
  onStartTour?: () => void;
  onLoadDefaultSample?: () => void;
}

const tagColor = (tag: string) => {
  if (tag === 'MSH') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (tag === 'PID') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (tag === 'PV1') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (tag === 'OBR' || tag === 'OBX') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (tag === 'NTE') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (tag.startsWith('Z')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

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
  onStartTour,
  onLoadDefaultSample,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDelims, setShowDelims] = useState(false);
  const [showLinterDrawer, setShowLinterDrawer] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lintReport = useMemo(() => lintHL7Message(rawHL7), [rawHL7]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawHL7);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = useMemo(() => {
    if (!rawHL7) return [''];
    return rawHL7.split(/\r\n|\r|\n/);
  }, [rawHL7]);

  const lineCount = lines.filter((l) => l.trim().length > 0).length;
  const charCount = rawHL7.length;

  // Summarize segment topology e.g. MSH -> PID -> PV1 -> OBX (x5)
  const segmentChain = useMemo(() => {
    const rawLines = rawHL7.trim().split(/\r\n|\r|\n/).filter(Boolean);
    const chain: { tag: string; count: number }[] = [];
    for (const l of rawLines) {
      const tag = l.slice(0, 3).toUpperCase();
      if (!tag) continue;
      if (chain.length > 0 && chain[chain.length - 1].tag === tag) {
        chain[chain.length - 1].count++;
      } else {
        chain.push({ tag, count: 1 });
      }
    }
    return chain;
  }, [rawHL7]);

  const handleFormat = () => {
    const normalized = rawHL7
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\r');
    setRawHL7(normalized);
  };

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onMapToFHIR();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      <div className="panel-toolbar">
        <div className="panel-toolbar-row">
          <div className="panel-toolbar-title">
            <Code className="w-4 h-4 text-panel-accent shrink-0" />
            <h2>Clinical Message</h2>
            <span className="panel-toolbar-count" title={`${lineCount} segments, ${charCount} characters`}>
              {lineCount} seg
            </span>
          </div>
          <div className="panel-toolbar-actions">
            {rawHL7.trim() && (
              <PanelButton
                onClick={() => setShowLinterDrawer(!showLinterDrawer)}
                tone={lintReport.errors_count > 0 ? 'danger' : lintReport.warnings_count > 0 ? 'warning' : 'safe'}
                aria-label={`Conformance diagnostics: ${lintReport.score}%, ${lintReport.errors_count} errors, ${lintReport.warnings_count} warnings`}
                aria-expanded={showLinterDrawer}
                title={`Conformance diagnostics: ${lintReport.errors_count} errors, ${lintReport.warnings_count} warnings`}
              >
                {lintReport.errors_count > 0 ? <AlertCircle className="w-3.5 h-3.5" /> : lintReport.warnings_count > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span className="font-mono text-[11px]">{lintReport.score}%</span>
              </PanelButton>
            )}
            <PanelButton iconOnly onClick={handleFormat} disabled={!rawHL7.trim()} aria-label="Format message" title="Format message">
              <Wand2 className="w-3.5 h-3.5" />
            </PanelButton>
            <PanelButton iconOnly onClick={handleCopy} disabled={!rawHL7.trim()} aria-label={copied ? 'Message copied' : 'Copy message'} title={copied ? 'Copied' : 'Copy message'}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </PanelButton>
            <PanelButton iconOnly onClick={() => setRawHL7('')} disabled={!rawHL7.trim()} aria-label="Clear message" title="Clear message">
              <Trash2 className="w-3.5 h-3.5" />
            </PanelButton>
          </div>
        </div>
      </div>

      {/* HL7 Linter Diagnostics Drawer */}
      {showLinterDrawer && (
        <div className="bg-slate-50/95 border-b border-slate-200/90 p-3 max-h-64 overflow-y-auto transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-semibold text-slate-800">HL7 v2 Conformance Diagnostics</span>
              {lintReport.message_type && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  {lintReport.message_type}
                </span>
              )}
              {lintReport.hl7_version && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  v{lintReport.hl7_version}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Quality Score:</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    lintReport.score >= 90
                      ? 'text-emerald-700'
                      : lintReport.score >= 70
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {lintReport.score}%
                </span>
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      lintReport.score >= 90
                        ? 'bg-emerald-500'
                        : lintReport.score >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${lintReport.score}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => setShowLinterDrawer(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-200/60 cursor-pointer"
                title="Close diagnostics"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 space-y-2">
            {lintReport.issues.length === 0 ? (
              <div className="flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200/70 rounded-lg text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Message conforms with HL7 v2 standard rules and syntax guidelines. No defects found.</span>
              </div>
            ) : (
              lintReport.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-2.5 rounded-lg border text-xs ${
                    issue.severity === 'error'
                      ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                      : issue.severity === 'warning'
                      ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                      : 'bg-sky-50/70 border-sky-200/80 text-sky-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {issue.severity === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {issue.severity === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      {issue.severity === 'info' && <Info className="w-3.5 h-3.5 text-sky-600" />}
                      <span>{issue.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-white/80 border border-current font-bold uppercase">
                        {issue.severity}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/80 border border-current font-bold">
                        {issue.field || issue.segment}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed mb-1.5">{issue.message}</p>
                  <div className="bg-white/70 px-2 py-1 rounded text-[11px] font-medium border border-current/20 flex items-start gap-1">
                    <span className="shrink-0">💡</span>
                    <span>{issue.recommendation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Active Sample Context Banner */}
      {activeSample && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sky-800">{activeSample.title}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{activeSample.description}</p>
            </div>
          </div>
          {activeSample.highlights && activeSample.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {activeSample.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Segment Topology Ribbon */}
      {segmentChain.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-100/60 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Topology</span>
          {segmentChain.map((seg, i) => (
            <React.Fragment key={i}>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${tagColor(seg.tag)}`}
                title={`${seg.tag} segment (${seg.count} instance${seg.count > 1 ? 's' : ''})`}
              >
                {seg.tag}
                {seg.count > 1 && <span className="ml-1 opacity-75">×{seg.count}</span>}
              </span>
              {i < segmentChain.length - 1 && (
                <span className="text-slate-300 font-mono text-[10px] shrink-0">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Raw HL7 Input Area with Line Numbers */}
      <div className="relative flex-1 p-2 bg-slate-50 flex flex-col min-h-0">
        <div className="relative flex flex-1 min-h-0 bg-white rounded-lg border border-slate-200 overflow-hidden focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50">
          {/* Line Numbers Gutter */}
          <div
            ref={gutterRef}
            className="bg-slate-50/80 border-r border-slate-200 py-3 px-2 text-right select-none font-mono text-xs text-slate-400 min-w-[34px] overflow-hidden leading-relaxed"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={rawHL7}
            onChange={(e) => setRawHL7(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            placeholder={rawHL7 ? '' : 'Paste raw HL7 v2 message here (e.g. MSH|^~\\&|...)... or select a clinical scenario above.'}
            className="flex-1 p-3 font-mono text-xs text-slate-800 bg-transparent outline-none resize-none leading-relaxed selection:bg-sky-100 selection:text-sky-800 overflow-y-auto whitespace-pre z-10"
            spellCheck={false}
          />

          {/* Quick-Start Blank Canvas Card when empty */}
          {!rawHL7.trim() && !loading && !mappingLoading && (
            <div
              onClick={() => textareaRef.current?.focus()}
              className="absolute inset-0 left-9 flex flex-col items-center justify-center p-6 text-center bg-white/95 cursor-text z-20"
            >
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mb-3 shadow-xs">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                Awaiting Clinical Message
              </h3>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed mb-4">
                Paste an HL7 v2.x clinical message, load a curated hospital admission scenario, or start the guided demo.
              </p>

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs"
              >
                {onStartTour && (
                  <button
                    type="button"
                    onClick={onStartTour}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold shadow-2xs transition active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Start Guided Demo</span>
                  </button>
                )}
                {onLoadDefaultSample && (
                  <button
                    type="button"
                    onClick={onLoadDefaultSample}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium shadow-2xs transition active:scale-[0.98] cursor-pointer"
                  >
                    <Hospital className="w-3.5 h-3.5 text-slate-500" />
                    <span>Load Sample Admission</span>
                  </button>
                )}
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-3.5 flex items-center gap-1.5 text-[11px] text-slate-400"
              >
                <span>or</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text && text.trim()) setRawHL7(text);
                    } catch {
                      textareaRef.current?.focus();
                    }
                  }}
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium underline cursor-pointer"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>paste from clipboard</span>
                </button>
                <span>or click to type</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PHI Security Guardrail Setting Bar */}
      <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={phiScrubbingEnabled}
            onChange={(e) => setPhiScrubbingEnabled(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-100 border-slate-300 text-sky-600 focus:ring-0"
          />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-700 font-medium">Protect patient information (PHI)</span>
        </label>
        <span className="text-[11px] text-slate-500">Reversible token vault active</span>
      </div>

      {/* Footer Bar with Delimiter Badges and Action Buttons */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <button
            onClick={() => setShowDelims(!showDelims)}
            className="flex items-center gap-1 hover:text-sky-700 transition cursor-pointer"
            title="Show message separators"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>{showDelims ? 'Hide' : 'Show'} separators</span>
          </button>
          {showDelims && delimiters && (
            <div className="flex items-center gap-1 font-mono">
              {[
                ['F', delimiters.field],
                ['C', delimiters.component],
                ['R', delimiters.repetition],
                ['E', delimiters.escape],
                ['S', delimiters.subcomponent],
              ].map(([k, v]) => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px]"
                >
                  {k}:{v}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Parse AST Button */}
          <button
            onClick={onParse}
            disabled={loading || mappingLoading || !rawHL7.trim()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-medium text-xs transition border border-slate-200 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-sky-600" />
            <span>Structure only</span>
          </button>

          {/* Primary Map to FHIR Button */}
          <button
            onClick={onMapToFHIR}
            disabled={loading || mappingLoading || !rawHL7.trim()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs text-white shadow-sm transition active:scale-[0.98] cursor-pointer"
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
