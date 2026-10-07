import React, { useState } from 'react';
import type { MapHL7Response, AmbiguityFlag } from '../types/hl7';
import Editor from '@monaco-editor/react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  Layers,
  Activity,
  User,
  HeartPulse,
  Stethoscope,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';

interface FHIRBundleViewerProps {
  mappingResult: MapHL7Response;
  onOpenPHIAudit: () => void;
  onSelectAmbiguity?: (ambiguity: AmbiguityFlag) => void;
  onOpenResolutionDeck?: () => void;
  onDirectJsonEdit?: (updatedBundle: any) => void;
}

export const FHIRBundleViewer: React.FC<FHIRBundleViewerProps> = ({
  mappingResult,
  onOpenPHIAudit,
  onSelectAmbiguity,
  onOpenResolutionDeck,
  onDirectJsonEdit,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'json'>('cards');
  const [useRehydrated, setUseRehydrated] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL');
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const currentBundle = useRehydrated
    ? mappingResult.rehydrated_bundle
    : mappingResult.fhir_bundle;

  const entries: any[] = currentBundle?.entry || [];
  const resourceConfidences = mappingResult.resource_confidences || {};

  // Keep JSON text synced with currentBundle
  React.useEffect(() => {
    setJsonText(JSON.stringify(currentBundle, null, 2));
    setJsonError(null);
  }, [currentBundle]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonText);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fhir-bundle-${currentBundle?.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleMonacoChange = (val: string | undefined) => {
    if (!val) return;
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError(null);
      if (onDirectJsonEdit) {
        onDirectJsonEdit(parsed);
      }
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError('Cannot prettify invalid JSON.');
    }
  };

  const handleResetJson = () => {
    const orig = JSON.stringify(currentBundle, null, 2);
    setJsonText(orig);
    setJsonError(null);
    if (onDirectJsonEdit) {
      onDirectJsonEdit(currentBundle);
    }
  };

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (selectedResourceType === 'ALL') return true;
    return e.resource?.resourceType === selectedResourceType;
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Patient':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'Encounter':
        return <Activity className="w-4 h-4 text-indigo-400" />;
      case 'Observation':
        return <HeartPulse className="w-4 h-4 text-emerald-400" />;
      case 'DiagnosticReport':
        return <ClipboardList className="w-4 h-4 text-cyan-400" />;
      case 'Condition':
        return <Stethoscope className="w-4 h-4 text-amber-400" />;
      case 'Coverage':
        return <ShieldCheck className="w-4 h-4 text-teal-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getConfidenceBadge = (resId: string) => {
    const meta = resourceConfidences[resId];
    if (!meta) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          Confidence: 95%
        </span>
      );
    }

    if (meta.level === 'high') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          High ({meta.score}%)
        </span>
      );
    } else if (meta.level === 'medium') {
      const linkedAmb = meta.ambiguity_ids?.[0]
        ? mappingResult.ambiguities.find((a) => a.id === meta.ambiguity_ids[0])
        : undefined;

      return (
        <button
          onClick={() => linkedAmb && onSelectAmbiguity && onSelectAmbiguity(linkedAmb)}
          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 hover:bg-amber-900/60 transition"
          title="Click to resolve ambiguity"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Needs Review ({meta.score}%)
        </button>
      );
    } else {
      const linkedAmb = meta.ambiguity_ids?.[0]
        ? mappingResult.ambiguities.find((a) => a.id === meta.ambiguity_ids[0])
        : undefined;

      return (
        <button
          onClick={() => linkedAmb && onSelectAmbiguity && onSelectAmbiguity(linkedAmb)}
          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 hover:bg-rose-900/60 transition animate-pulse"
          title="Click to resolve required clinical input"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Action Required ({meta.score}%)
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-sm text-slate-200">Semantic FHIR R4 Bundle Studio</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-medium">
            {entries.length} Resources Generated
          </span>
        </div>

        {/* View Controls & PHI Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* PHI Re-Hydration Toggle */}
          <button
            onClick={() => setUseRehydrated(!useRehydrated)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition border ${
              useRehydrated
                ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
            }`}
            title={useRehydrated ? 'Showing Re-Hydrated Local PHI' : 'Showing De-Identified Synthetic Tokens'}
          >
            {useRehydrated ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-rose-400" />
                <span>Re-Hydrated PHI (Local)</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>De-Identified [Tokens]</span>
              </>
            )}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual Cards</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
                viewMode === 'json'
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Monaco Editor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subheader: Confidence, Ambiguities, and PHI Redaction Audit Chips */}
      <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          {/* Confidence Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <div
              className={`w-2 h-2 rounded-full ${
                mappingResult.confidence_score >= 90
                  ? 'bg-emerald-400'
                  : mappingResult.confidence_score >= 70
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-300">
              Confidence:{' '}
              <strong className="text-cyan-300 font-mono">
                {mappingResult.confidence_score}%
              </strong>
            </span>
          </div>

          {/* Ambiguities Alert */}
          {mappingResult.ambiguities.length > 0 && (
            <button
              onClick={onOpenResolutionDeck}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/80 text-amber-200 hover:bg-amber-900/60 transition"
              title="Open Human-in-the-Loop Resolution Deck"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                <strong>{mappingResult.ambiguities.filter((a) => !a.is_resolved).length}</strong>{' '}
                Pending Ambiguities
              </span>
            </button>
          )}

          {/* PHI Redactions Chip */}
          <button
            onClick={onOpenPHIAudit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition"
            title="View PHI Redaction Audit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              <strong>{mappingResult.phi_audit.total_redactions}</strong> PHI Scrubbed
            </span>
          </button>
        </div>

        {/* Quick Resource Type Filter */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedResourceType('ALL')}
            className={`text-[11px] px-2 py-0.5 rounded border transition ${
              selectedResourceType === 'ALL'
                ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({entries.length})
          </button>
          {mappingResult.resource_types.map((type) => {
            const count = entries.filter((e) => e.resource?.resourceType === type).length;
            return (
              <button
                key={type}
                onClick={() => setSelectedResourceType(type)}
                className={`text-[11px] px-2 py-0.5 rounded border transition ${
                  selectedResourceType === type
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden bg-slate-950/60 flex flex-col">
        {viewMode === 'cards' ? (
          /* Visual Resource Cards */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredEntries.map((entry, idx) => {
              const res = entry.resource;
              const resType = res.resourceType;
              const confidenceBadge = getConfidenceBadge(res.id);

              return (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 hover:border-slate-700 transition space-y-2.5"
                >
                  {/* Card Header with Confidence Badge */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-slate-950 border border-slate-800">
                        {getResourceIcon(resType)}
                      </div>
                      <span className="font-mono font-bold text-xs text-cyan-300">
                        {resType}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        id: {res.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {confidenceBadge}
                      {res.status && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                          {res.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resource Specific Body */}
                  {resType === 'Patient' && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400">Legal Name:</span>
                        <strong className="text-slate-100 font-mono">
                          {res.name?.[0]?.text || 'N/A'}
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-500">MRN:</span>{' '}
                          <span className="text-cyan-300 font-mono">{res.identifier?.[0]?.value || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Gender:</span>{' '}
                          <span className="capitalize text-slate-200">{res.gender || 'unknown'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">DOB:</span>{' '}
                          <span className="font-mono text-slate-200">{res.birthDate || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Telecom:</span>{' '}
                          <span className="font-mono text-slate-200">{res.telecom?.[0]?.value || 'N/A'}</span>
                        </div>
                      </div>
                      {res.address?.[0] && (
                        <div className="text-[11px] text-slate-400 pt-1">
                          <span className="text-slate-500">Address:</span>{' '}
                          <span>
                            {res.address[0].line?.join(', ')}, {res.address[0].city},{' '}
                            {res.address[0].state} {res.address[0].postalCode}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {resType === 'Observation' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-100">{res.code?.text}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            LOINC: {res.code?.coding?.[0]?.code} ({res.code?.coding?.[0]?.system})
                          </p>
                        </div>

                        {/* Measured Value */}
                        <div className="text-right">
                          {res.valueQuantity ? (
                            <div className="flex items-baseline gap-1 justify-end font-mono">
                              <span className="text-base font-bold text-cyan-300">
                                {res.valueQuantity.value}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">
                                {res.valueQuantity.unit}
                              </span>
                            </div>
                          ) : res.valueString ? (
                            <span className="text-xs font-mono text-cyan-300 font-medium">
                              {res.valueString}
                            </span>
                          ) : res.component ? (
                            <div className="space-y-0.5 text-right font-mono text-[11px]">
                              {res.component.map((c: any, i: number) => (
                                <div key={i}>
                                  <span className="text-slate-500">{c.code?.text?.split(' ')[0]}:</span>{' '}
                                  <strong className="text-cyan-300">{c.valueQuantity?.value} {c.valueQuantity?.unit}</strong>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {res.interpretation?.[0] && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono mt-1 inline-block ${
                                res.interpretation[0].coding?.[0]?.code === 'H'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : res.interpretation[0].coding?.[0]?.code === 'L'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              Flag: {res.interpretation[0].text}
                            </span>
                          )}
                        </div>
                      </div>

                      {res.referenceRange?.[0] && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          Reference Range: {res.referenceRange[0].text}
                        </p>
                      )}
                    </div>
                  )}

                  {resType === 'DiagnosticReport' && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-100">{res.code?.text}</p>
                        <span className="text-[11px] font-mono text-cyan-400">
                          {res.result?.length || 0} Observations linked
                        </span>
                      </div>
                      {res.conclusion && (
                        <p className="text-[11px] text-slate-300 italic bg-slate-950 p-2 rounded border border-slate-850">
                          "{res.conclusion}"
                        </p>
                      )}
                      {res.extension && (
                        <div className="text-[10px] text-purple-300 font-mono bg-purple-950/30 p-1.5 rounded border border-purple-900/60">
                          Custom DICOM Study Extension: {JSON.stringify(res.extension[0].extension)}
                        </div>
                      )}
                    </div>
                  )}

                  {resType === 'Encounter' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400">Class:</span>
                        <strong className="text-slate-200 capitalize">
                          {res.class?.display || 'Ambulatory'}
                        </strong>
                      </div>
                      {res.location?.[0] && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">Location:</span>
                          <span className="text-slate-300 font-mono">
                            {res.location[0].location?.display}
                          </span>
                        </div>
                      )}
                      {res.participant?.[0] && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">Attending:</span>
                          <span className="text-slate-300">
                            {res.participant[0].individual?.display} (NPI:{' '}
                            {res.participant[0].individual?.identifier?.value})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {resType === 'Condition' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100">{res.code?.text}</span>
                        <span className="font-mono text-cyan-300 text-[11px]">
                          ICD-10: {res.code?.coding?.[0]?.code}
                        </span>
                      </div>
                    </div>
                  )}

                  {resType === 'Coverage' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100">{res.payor?.[0]?.display}</span>
                        <span className="font-mono text-cyan-300 text-[11px]">
                          Policy: {res.subscriberId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Monaco Editor JSON View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Monaco Action Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  Direct Monaco JSON Editor ({useRehydrated ? 'Re-Hydrated' : 'De-Identified'})
                </span>
                {jsonError && (
                  <span className="text-[11px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                    Syntax Error: {jsonError}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrettify}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Format JSON"
                >
                  Prettify
                </button>
                <button
                  onClick={handleResetJson}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Reset to AI mapping"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Monaco Component */}
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={jsonText}
                onChange={handleMonacoChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  tabSize: 2,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
