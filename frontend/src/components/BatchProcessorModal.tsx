import React, { useState, useMemo } from 'react';
import {
  Layers,
  UploadCloud,
  Download,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Eye,
  ArrowUpRight,
  RefreshCw,
  X,
  Server,
  Code,
  FileSpreadsheet,
} from 'lucide-react';
import {
  batchMapHL7,
  pushBundleToFHIRServer,
  type BatchMapResponse,
  type BatchMapResultItem,
} from '../services/api';
import { getAllSamples } from '../engine/sampleMessages';

interface BatchProcessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSingleMessage?: (rawHL7: string) => void;
}

export const BatchProcessorModal: React.FC<BatchProcessorModalProps> = ({
  isOpen,
  onClose,
  onLoadSingleMessage,
}) => {
  const [rawBatchInput, setRawBatchInput] = useState<string>('');
  const [enablePhiScrubbing, setEnablePhiScrubbing] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [batchResponse, setBatchResponse] = useState<BatchMapResponse | null>(null);
  const [selectedResult, setSelectedResult] = useState<BatchMapResultItem | null>(null);
  const [fhirServerUrl, setFhirServerUrl] = useState<string>('https://hapi.fhir.org/baseR4');
  const [fhirAuthToken, setFhirAuthToken] = useState<string>('');
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushing, setPushing] = useState<boolean>(false);

  // Split raw text into individual HL7 messages by MSH segment
  const detectedMessages = useMemo(() => {
    if (!rawBatchInput.trim()) return [];
    const normalized = rawBatchInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Split on MSH segments
    const parts = normalized.split(/(?=^MSH)/m).map((p) => p.trim()).filter(Boolean);
    return parts;
  }, [rawBatchInput]);

  if (!isOpen) return null;

  const handleLoadCohortSamples = () => {
    const samples = getAllSamples();
    const combined = samples.map((s) => s.raw.trim()).join('\r\n\r\n');
    setRawBatchInput(combined);
    setBatchResponse(null);
    setSelectedResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawBatchInput(content);
        setBatchResponse(null);
        setSelectedResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRunBatch = async () => {
    if (detectedMessages.length === 0) return;
    setProcessing(true);
    setBatchResponse(null);
    setSelectedResult(null);
    setPushStatus(null);
    try {
      const resp = await batchMapHL7(detectedMessages, enablePhiScrubbing);
      setBatchResponse(resp);
    } catch (err: any) {
      alert(`Batch processing error: ${err?.message || err}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadNDJSON = () => {
    if (!batchResponse || !batchResponse.results) return;
    // Extract every resource from every bundle and format as 1 line per resource
    const lines: string[] = [];
    for (const res of batchResponse.results) {
      if (res.fhir_bundle && Array.isArray(res.fhir_bundle.entry)) {
        for (const entry of res.fhir_bundle.entry) {
          if (entry.resource) {
            lines.push(JSON.stringify(entry.resource));
          }
        }
      }
    }

    if (lines.length === 0) {
      alert('No resources available to export.');
      return;
    }

    const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `semanticare-batch-export-${Date.now()}.ndjson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadConsolidatedJSON = () => {
    if (!batchResponse || !batchResponse.results) return;
    const bundles = batchResponse.results
      .filter((r) => r.success && r.fhir_bundle)
      .map((r) => r.fhir_bundle);

    const blob = new Blob([JSON.stringify(bundles, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `semanticare-consolidated-bundles-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePushToFHIRServer = async () => {
    if (!batchResponse || !batchResponse.results) return;
    const successful = batchResponse.results.filter((r) => r.success && r.fhir_bundle);
    if (successful.length === 0) {
      setPushStatus('No successful bundles to push.');
      return;
    }

    setPushing(true);
    setPushStatus(`Transmitting ${successful.length} bundles to ${fhirServerUrl}...`);

    let pushed = 0;
    let failed = 0;

    for (const item of successful) {
      try {
        const pushRes = await pushBundleToFHIRServer(
          item.fhir_bundle,
          fhirServerUrl,
          fhirAuthToken || undefined
        );
        if (pushRes.success) {
          pushed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setPushing(false);
    setPushStatus(
      `Push complete: ${pushed} transmitted successfully, ${failed} failed (Target: ${fhirServerUrl}).`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  Enterprise Batch Processing Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                  BULK NDJSON
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bulk clinical HL7 v2 translation, aggregate quality metrics, and NDJSON streaming export
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Controls Panel */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Multi-Message Payload:</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                  {detectedMessages.length} message{detectedMessages.length !== 1 ? 's' : ''} detected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleLoadCohortSamples}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition font-medium cursor-pointer"
                  title="Load all 5 built-in clinical scenario messages"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Cohort Samples (5 Messages)</span>
                </button>

                <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition font-medium cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".hl7,.txt,.ndjson"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {rawBatchInput && (
                  <button
                    onClick={() => {
                      setRawBatchInput('');
                      setBatchResponse(null);
                      setSelectedResult(null);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Raw Batch Textarea */}
            <div className="relative">
              <textarea
                value={rawBatchInput}
                onChange={(e) => setRawBatchInput(e.target.value)}
                placeholder="Paste multiple HL7 v2 messages here, each starting with MSH|^~\&|... Or click 'Load Cohort Samples' above."
                rows={5}
                className="w-full p-3 font-mono text-xs bg-white rounded-lg border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Bottom Config & Run Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enablePhiScrubbing}
                  onChange={(e) => setEnablePhiScrubbing(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-0 border-slate-300"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-700 font-medium">
                  De-identify patient identifiers (PHI Token Vault)
                </span>
              </label>

              <button
                onClick={handleRunBatch}
                disabled={processing || detectedMessages.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-sky-900/10 transition cursor-pointer disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Batch ({detectedMessages.length} messages)…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Process All {detectedMessages.length} Messages</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results View */}
          {batchResponse && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Aggregate Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Processed Cohort</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-slate-900">
                      {batchResponse.successful_messages}
                    </span>
                    <span className="text-xs text-slate-500">/ {batchResponse.total_messages}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 inline-block">
                    ✓ {Math.round((batchResponse.successful_messages / Math.max(1, batchResponse.total_messages)) * 100)}% Success Rate
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Generated Resources</span>
                  <div className="text-xl font-bold text-sky-700 mt-1">
                    {batchResponse.aggregate_metrics.total_resources_generated}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
                    FHIR R4 valid profiles
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Mean Confidence</span>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {batchResponse.aggregate_metrics.average_confidence_score}%
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
                    Terminology & schema match
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Vaulted PHI Tokens</span>
                  <div className="text-xl font-bold text-purple-700 mt-1">
                    {batchResponse.aggregate_metrics.total_phi_redactions}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
                    Zero-trust tokenized
                  </span>
                </div>
              </div>

              {/* Action Toolbar for Bulk Downloads and Push */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-sky-50/60 border border-sky-200/70 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-700" />
                  <span className="text-xs font-semibold text-sky-950">Bulk Export Actions:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadNDJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-medium shadow-xs transition cursor-pointer"
                    title="Export every generated resource in FHIR Bulk NDJSON format"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Bulk NDJSON (.ndjson)</span>
                  </button>

                  <button
                    onClick={handleDownloadConsolidatedJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition cursor-pointer"
                    title="Download consolidated array of FHIR Bundles as JSON"
                  >
                    <Code className="w-3.5 h-3.5 text-slate-500" />
                    <span>Consolidated Bundles (.json)</span>
                  </button>
                </div>
              </div>

              {/* Message-by-Message Results Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Cohort Execution Log</span>
                  <span className="text-[11px] text-slate-500">
                    Click any item to view bundle JSON or load into studio
                  </span>
                </div>

                <div className="divide-y divide-slate-200 max-h-72 overflow-y-auto">
                  {batchResponse.results.map((item, idx) => {
                    const firstLine = item.raw_message?.split(/\r\n|\r|\n/)[0] || '';
                    const mshParts = firstLine.split('|');
                    const msgType = mshParts[8] || 'HL7 Message';

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition cursor-pointer ${
                          selectedResult?.message_index === item.message_index ? 'bg-sky-50/40' : ''
                        }`}
                        onClick={() => setSelectedResult(item)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                            {idx + 1}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {msgType}
                              </span>
                              {item.success ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Success</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Failed</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5 max-w-md">
                              {firstLine}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.success ? (
                            <>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                                {item.total_resources} resources
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.confidence_score}% conf
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-rose-600 max-w-xs truncate">
                              {item.error}
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResult(item);
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                            title="Inspect JSON"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {onLoadSingleMessage && item.raw_message && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLoadSingleMessage(item.raw_message!);
                                onClose();
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 hover:border-sky-200 font-medium transition cursor-pointer"
                              title="Load this message in the main studio editor"
                            >
                              <span>Load in Studio</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Result JSON Inspector */}
              {selectedResult && selectedResult.fhir_bundle && (
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Bundle JSON (Message #{selectedResult.message_index + 1})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedResult(null)}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-sky-300 max-h-60 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800 select-all whitespace-pre leading-relaxed">
                    {JSON.stringify(selectedResult.fhir_bundle, null, 2)}
                  </pre>
                </div>
              )}

              {/* Direct FHIR Push Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Push Batch to Target FHIR R4 Repository
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="url"
                    value={fhirServerUrl}
                    onChange={(e) => setFhirServerUrl(e.target.value)}
                    placeholder="https://hapi.fhir.org/baseR4"
                    className="sm:col-span-2 p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="password"
                    value={fhirAuthToken}
                    onChange={(e) => setFhirAuthToken(e.target.value)}
                    placeholder="Bearer token (optional)"
                    className="p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    Transmits all valid bundles via transaction / batch HTTP POST.
                  </span>
                  <button
                    onClick={handlePushToFHIRServer}
                    disabled={pushing || !fhirServerUrl.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    {pushing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{pushing ? 'Transmitting…' : 'Transmit to Server'}</span>
                  </button>
                </div>

                {pushStatus && (
                  <div className="p-2 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                    {pushStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise Bulk Pipeline • HL7 v2 to FHIR R4 Specification</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
