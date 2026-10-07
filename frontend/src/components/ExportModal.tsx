import React, { useState } from 'react';
import type { MapHL7Response } from '../types/hl7';
import { pushBundleToFHIRServer } from '../services/api';
import {
  X,
  Download,
  Copy,
  Check,
  Lock,
  Unlock,
  FileCode,
  Database,
  ShieldCheck,
  Send,
  Server,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface ExportModalProps {
  mappingResult: MapHL7Response;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ mappingResult, onClose }) => {
  const [flavor, setFlavor] = useState<'deidentified' | 'rehydrated'>('deidentified');
  const [format, setFormat] = useState<'json' | 'ndjson'>('json');
  const [copied, setCopied] = useState(false);

  // FHIR Server Push state
  const [showPushSection, setShowPushSection] = useState(false);
  const [fhirServerUrl, setFhirServerUrl] = useState('https://hapi.fhir.org/baseR4');
  const [authToken, setAuthToken] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{
    success?: boolean;
    statusCode?: number;
    message?: string;
    details?: string;
  } | null>(null);

  const activeBundle =
    flavor === 'rehydrated'
      ? mappingResult.rehydrated_bundle
      : mappingResult.fhir_bundle;

  const entries: any[] = activeBundle?.entry || [];

  const getPayloadString = (): string => {
    if (format === 'json') {
      return JSON.stringify(activeBundle, null, 2);
    } else {
      return entries
        .map((e) => JSON.stringify(e.resource))
        .join('\n');
    }
  };

  const payloadText = getPayloadString();
  const fileExtension = format === 'json' ? 'json' : 'ndjson';
  const fileName = `fhir-${flavor}-${activeBundle?.id || 'bundle'}.${fileExtension}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const mimeType = format === 'json' ? 'application/json' : 'application/x-ndjson';
    const blob = new Blob([payloadText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handlePushToFHIR = async () => {
    if (!fhirServerUrl.trim()) return;
    setIsPushing(true);
    setPushStatus(null);
    try {
      const res = await pushBundleToFHIRServer(
        activeBundle,
        fhirServerUrl.trim(),
        authToken.trim() || undefined
      );
      setPushStatus({
        success: res.success,
        statusCode: res.status_code,
        message: res.message || (res.success ? 'Transaction processed successfully' : 'Push failed'),
        details: res.response_body || res.error,
      });
    } catch (err: any) {
      setPushStatus({
        success: false,
        statusCode: 500,
        message: 'Network error communicating with backend push gateway',
        details: err.message,
      });
    } finally {
      setIsPushing(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center">
              <Download className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">FHIR R4 Bundle Export Pipeline</h3>
              <p className="text-xs text-slate-400">Download, Copy, or Stream Validated Healthcare Payloads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Step 1: Choose Privacy Flavor */}
          <div>
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              1. Select Data Privacy Flavor
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setFlavor('deidentified')}
                className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                  flavor === 'deidentified'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-xs text-slate-200">De-Identified [Tokens]</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Patient names and identifiers replaced with synthetic tokens. Safe for external AI models, research, or cross-cloud analytics.
                </p>
              </label>

              <label
                onClick={() => setFlavor('rehydrated')}
                className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                  flavor === 'rehydrated'
                    ? 'bg-rose-950/30 border-rose-500 text-rose-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Unlock className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-xs text-slate-200">Re-Hydrated [Clinical PHI]</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Restores original patient names, MRNs, and demographics locally for authorized clinical EHR integration.
                </p>
              </label>
            </div>
          </div>

          {/* Step 2: Choose File Format */}
          <div>
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              2. Select Target File Format
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setFormat('json')}
                className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                  format === 'json'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-xs text-slate-200">Standard FHIR Bundle (.json)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Full transaction bundle formatted with indentations for FHIR server API endpoints (POST /Bundle).
                </p>
              </label>

              <label
                onClick={() => setFormat('ndjson')}
                className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                  format === 'ndjson'
                    ? 'bg-purple-950/40 border-purple-500 text-purple-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-xs text-slate-200">Bulk NDJSON (.ndjson)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Newline-delimited JSON (one resource per line). Standard for Bulk FHIR, BigQuery, and Data Lakes.
                </p>
              </label>
            </div>
          </div>

          {/* Step 3: Payload Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Payload Preview ({fileName})
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {entries.length} resources • {payloadText.length} bytes
              </span>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 max-h-40 overflow-auto leading-relaxed select-all">
              {payloadText.slice(0, 1500)}
              {payloadText.length > 1500 && '\n\n... (truncated preview)'}
            </pre>
          </div>

          {/* Step 4: Direct FHIR Server Push (Optional Enterprise Integration) */}
          <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200 text-xs">
                  Transmit to Live FHIR Repository (HAPI, Cloud Healthcare, AWS HealthLake)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPushSection(!showPushSection)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                {showPushSection ? 'Hide' : 'Configure Endpoint'}
              </button>
            </div>

            {showPushSection && (
              <div className="space-y-2.5 pt-1 text-xs animate-in fade-in">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    FHIR R4 Server Base URL
                  </label>
                  <input
                    type="text"
                    value={fhirServerUrl}
                    onChange={(e) => setFhirServerUrl(e.target.value)}
                    placeholder="https://hapi.fhir.org/baseR4"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Bearer Token / API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Bearer token or authorization header..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Transmits as transaction Bundle via HTTP POST with application/fhir+json
                  </span>
                  <button
                    type="button"
                    onClick={handlePushToFHIR}
                    disabled={isPushing || !fhirServerUrl.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow disabled:opacity-50 transition active:scale-[0.98] cursor-pointer"
                  >
                    {isPushing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isPushing ? 'Transmitting...' : 'Push Transaction'}</span>
                  </button>
                </div>

                {pushStatus && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      pushStatus.success
                        ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                        : 'bg-rose-950/70 border-rose-800 text-rose-200'
                    }`}
                  >
                    {pushStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-[11px]">
                        HTTP {pushStatus.statusCode}: {pushStatus.message}
                      </div>
                      {pushStatus.details && (
                        <pre className="mt-1 text-[10px] font-mono bg-black/40 p-1.5 rounded max-h-24 overflow-auto">
                          {pushStatus.details}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950/40 transition active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {fileName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
