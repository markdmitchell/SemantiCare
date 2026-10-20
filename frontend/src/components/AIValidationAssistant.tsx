import { useEffect, useRef, useState } from 'react';
import { Sparkles, Square, X, Copy } from 'lucide-react';
import { PanelButton } from './PanelButton';
import { prepareValidationContext } from '../engine/aiValidationContext';
import type { ValidationResult } from '../types/hl7';

export function AIValidationAssistant({ result, profile }: { result: ValidationResult; profile: string }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const context = prepareValidationContext(result, profile);
  const signature = JSON.stringify(result);
  useEffect(() => {
    abort.current?.abort(); abort.current = null; setText(''); setReasoning(''); setError(''); setConfirmed(false); setCopied(false); setLoading(false); setOpen(false);
    return () => { abort.current?.abort(); abort.current = null; };
  }, [signature, profile]);

  async function explain() {
    if (!confirmed || loading) return;
    const controller = new AbortController(); abort.current = controller;
    setLoading(true); setText(''); setReasoning(''); setError(''); setCopied(false);
    try {
      const response = await fetch('/api/validation-explanation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(context), signal: controller.signal });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'AI service is unavailable.' }));
        throw new Error(body.error || 'AI service is unavailable.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('The AI service returned no explanation.');
      const decoder = new TextDecoder(); let buffer = '';
      function consume(line: string) {
        if (!line.trim() || controller.signal.aborted) return;
        const event = JSON.parse(line);
        if (event.type === 'text') setText(prev => prev + event.text);
        if (event.type === 'reasoning') setReasoning(prev => prev + event.text);
        if (event.type === 'error') setError(event.message);
      }
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        lines.forEach(consume);
      }
      buffer += decoder.decode(); consume(buffer);
    } catch (err) {
      if (abort.current === controller) setError(controller.signal.aborted ? 'Request stopped. Partial output has been kept.' : err instanceof Error ? err.message : 'AI request failed.');
    } finally { if (abort.current === controller) setLoading(false); }
  }

  return <>
    <PanelButton ref={trigger} disabled={!context.failures.length} onClick={() => setOpen(true)} title="Explain validation findings with AI"><Sparkles size={14} /> Explain with AI</PanelButton>
    {open && <div className="fixed inset-0 z-50 bg-panel-text/30 flex items-center justify-center p-4" onKeyDown={event => {
      if (event.key === 'Escape') { abort.current?.abort(); setOpen(false); trigger.current?.focus(); }
      if (event.key === 'Tab') {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary') || []).filter(el => el.getClientRects().length > 0);
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="ai-validation-title" className="bg-panel-surface text-panel-text border border-panel-border rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl min-w-0">
        <header className="flex items-center justify-between gap-3 p-4 border-b border-panel-border">
          <h2 id="ai-validation-title" className="font-semibold flex items-center gap-2"><Sparkles size={18} /> Validation explanation</h2>
          <PanelButton iconOnly autoFocus aria-label="Close validation explanation" onClick={() => { abort.current?.abort(); setOpen(false); trigger.current?.focus(); }}><X size={16} /></PanelButton>
        </header>
        <div className="overflow-y-auto p-4 space-y-4 text-sm">
          <p className="text-panel-muted">AI advice is optional. Processing your HL7 message remains on your device. No changes are applied automatically.</p>
          <div className="border-y border-panel-border py-3">
            <p className="font-medium">Review what will be sent</p>
            <p className="text-panel-muted mt-1">{context.failures.length} failure categories, field locations, and {profile === 'base' ? 'Base FHIR R4' : 'US Core'} profile selection. No raw HL7, patient identifiers, clinical values, or FHIR bundles.</p>
            {context.omitted > 0 && <p className="text-panel-warning mt-1">{context.omitted} unsupported findings excluded.</p>}
            <details className="mt-2"><summary className="cursor-pointer text-panel-accent">Failure locations</summary><ul className="mt-2 space-y-1 font-mono text-xs">{context.failures.map(f => <li key={f.index}>#{f.index} {f.severity}: {f.path}</li>)}</ul></details>
            <label className="flex gap-2 items-start mt-3"><input type="checkbox" checked={confirmed} disabled={loading} onChange={e => setConfirmed(e.target.checked)} className="mt-1 accent-panel-accent" />I agree to send these structural findings to Lovable AI. AI usage uses workspace credits.</label>
          </div>
          {reasoning && <details><summary className="cursor-pointer text-panel-muted">Model reasoning summary</summary><p className="mt-2 whitespace-pre-wrap text-panel-muted">{reasoning}</p></details>}
          {loading && <p role="status" className="text-panel-accent">{text ? 'Writing recommendations...' : 'Reviewing validation findings...'}</p>}
          {error && <p role="alert" className="text-panel-danger">{error}</p>}
          {text && <div className="whitespace-pre-wrap leading-relaxed break-words" aria-live="polite">{text}</div>}
          <p className="text-xs text-panel-muted">These findings come from a limited workbench rule set, not the official FHIR validator. Confirm the exact implementation guide and review all recommendations before changing clinical data.</p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 p-4 border-t border-panel-border">
          {text && <PanelButton onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setError('Could not copy the explanation.'); } }}><Copy size={14} />{copied ? 'Copied' : 'Copy explanation'}</PanelButton>}
          {loading ? <PanelButton onClick={() => abort.current?.abort()}><Square size={14} />Stop</PanelButton> : <PanelButton disabled={!confirmed || !context.failures.length} onClick={explain}><Sparkles size={14} />{text ? 'Request new explanation' : 'Generate explanation'}</PanelButton>}
        </footer>
      </section>
    </div>}
  </>;
}