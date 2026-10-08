import React, { useState, useMemo } from 'react';
import type { MapHL7Response, AmbiguityFlag } from '../types/hl7';
import Editor, { DiffEditor } from '@monaco-editor/react';
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
  Search,
  GitCompare,
  Workflow,
  X,
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
  const [viewMode, setViewMode] = useState<'cards' | 'json' | 'diff' | 'tree'>('cards');
  const [useRehydrated, setUseRehydrated] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedResourceId, setCopiedResourceId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const currentBundle = useRehydrated
    ? mappingResult.rehydrated_bundle
    : mappingResult.fhir_bundle;

  const entries: any[] = currentBundle?.entry || [];
  const resourceConfidences = mappingResult.resource_confidences || {};

  // Build Provenance & Topology Hierarchy Tree
  const topology = useMemo(() => {
    const patientEntry = entries.find((e) => e.resource?.resourceType === 'Patient');
    const encounterEntries = entries.filter((e) => e.resource?.resourceType === 'Encounter');
    const diagnosticEntries = entries.filter((e) => e.resource?.resourceType === 'DiagnosticReport');
    const observationEntries = entries.filter((e) => e.resource?.resourceType === 'Observation');
    const conditionEntries = entries.filter((e) => e.resource?.resourceType === 'Condition');
    const serviceRequestEntries = entries.filter((e) => e.resource?.resourceType === 'ServiceRequest');
    const coverageEntries = entries.filter((e) => e.resource?.resourceType === 'Coverage');
    const otherEntries = entries.filter(
      (e) =>
        ![
          'Patient',
          'Encounter',
          'DiagnosticReport',
          'Observation',
          'Condition',
          'ServiceRequest',
          'Coverage',
        ].includes(e.resource?.resourceType)
    );

    return {
      patient: patientEntry?.resource,
      encounters: encounterEntries.map((e) => e.resource),
      diagnosticReports: diagnosticEntries.map((e) => e.resource),
      observations: observationEntries.map((e) => e.resource),
      conditions: conditionEntries.map((e) => e.resource),
      serviceRequests: serviceRequestEntries.map((e) => e.resource),
      coverages: coverageEntries.map((e) => e.resource),
      others: otherEntries.map((e) => e.resource),
    };
  }, [entries]);

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
    } catch (_err: any) {
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

  const handleCopySingleResource = (res: any, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(res, null, 2));
    setCopiedResourceId(res.id);
    setTimeout(() => setCopiedResourceId(null), 1800);
  };

  // Filter entries by selected resource type and text search query
  const filteredEntries = entries.filter((e) => {
    const res = e.resource;
    if (!res) return false;
    if (selectedResourceType !== 'ALL' && res.resourceType !== selectedResourceType) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const str = JSON.stringify(res).toLowerCase();
    return str.includes(q);
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Patient':
        return <User className="w-4 h-4 text-purple-600" />;
      case 'Encounter':
        return <Activity className="w-4 h-4 text-indigo-600" />;
      case 'Observation':
        return <HeartPulse className="w-4 h-4 text-emerald-600" />;
      case 'DiagnosticReport':
        return <ClipboardList className="w-4 h-4 text-sky-600" />;
      case 'Condition':
        return <Stethoscope className="w-4 h-4 text-amber-600" />;
      case 'Coverage':
        return <ShieldCheck className="w-4 h-4 text-teal-600" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  const getConfidenceBadge = (resId: string) => {
    const meta = resourceConfidences[resId];
    if (!meta) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
          Confidence: 95%
        </span>
      );
    }

    if (meta.level === 'high') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
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
          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 hover:bg-amber-100/60 transition"
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
          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 hover:bg-rose-100/60 transition animate-pulse"
          title="Click to resolve required clinical input"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Action Required ({meta.score}%)
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-sm text-slate-700">Semantic FHIR R4 Bundle Studio</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-medium">
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
                ? 'bg-rose-50/70 border-rose-300 text-rose-700'
                : 'bg-emerald-50/70 border-emerald-300 text-emerald-700'
            }`}
            title={useRehydrated ? 'Showing Re-Hydrated Local PHI' : 'Showing De-Identified Synthetic Tokens'}
          >
            {useRehydrated ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-rose-600" />
                <span>Re-Hydrated PHI (Local)</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>De-Identified [Tokens]</span>
              </>
            )}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual Cards</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                viewMode === 'json'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Monaco Editor</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                viewMode === 'diff'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Compare De-identified Token bundle with Re-hydrated PHI bundle side-by-side"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Token Diff</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Interactive clinical resource hierarchy and provenance tree"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Provenance Tree</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subheader: Confidence, Ambiguities, and PHI Redaction Audit Chips */}
      <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          {/* Confidence Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200">
            <div
              className={`w-2 h-2 rounded-full ${
                mappingResult.confidence_score >= 90
                  ? 'bg-emerald-400'
                  : mappingResult.confidence_score >= 70
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-600">
              Confidence:{' '}
              <strong className="text-sky-700 font-mono">
                {mappingResult.confidence_score}%
              </strong>
            </span>
          </div>

          {/* Ambiguities Alert */}
          {mappingResult.ambiguities.length > 0 && (
            <button
              onClick={onOpenResolutionDeck}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50/60 border border-amber-200/80 text-amber-700 hover:bg-amber-100/60 transition"
              title="Open Human-in-the-Loop Resolution Deck"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>
                <strong>{mappingResult.ambiguities.filter((a) => !a.is_resolved).length}</strong>{' '}
                Pending Ambiguities
              </span>
            </button>
          )}

          {/* PHI Redactions Chip */}
          <button
            onClick={onOpenPHIAudit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50/60 border border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/60 transition"
            title="View PHI Redaction Audit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              <strong>{mappingResult.phi_audit.total_redactions}</strong> PHI Scrubbed
            </span>
          </button>
        </div>

        {/* Quick Resource Type Filter & Search Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setSelectedResourceType('ALL')}
              className={`text-[11px] px-2 py-0.5 rounded border transition cursor-pointer ${
                selectedResourceType === 'ALL'
                  ? 'bg-sky-50 border-sky-600 text-sky-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
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
                  className={`text-[11px] px-2 py-0.5 rounded border transition cursor-pointer ${
                    selectedResourceType === type
                      ? 'bg-sky-50 border-sky-600 text-sky-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources..."
              className="pl-7 pr-6 py-0.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden bg-slate-50/60 flex flex-col">
        {viewMode === 'cards' ? (
          /* Visual Resource Cards */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-200">
                <Search className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-sm font-semibold text-slate-700">No matching FHIR resources</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? `No resources match "${searchQuery}" in ${selectedResourceType === 'ALL' ? 'all categories' : selectedResourceType}.`
                    : `No resources of type ${selectedResourceType} exist in this Bundle.`}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-3 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredEntries.map((entry, idx) => {
                const res = entry.resource;
                const resType = res.resourceType;
                const confidenceBadge = getConfidenceBadge(res.id);

              return (
                <div
                  key={idx}
                  className="bg-white/90 border border-slate-200 rounded-lg p-3.5 hover:border-slate-200 transition space-y-2.5"
                >
                  {/* Card Header with Confidence Badge */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-slate-50 border border-slate-200">
                        {getResourceIcon(resType)}
                      </div>
                      <span className="font-mono font-bold text-xs text-sky-700">
                        {resType}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        id: {res.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopySingleResource(res, e)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                        title="Copy resource JSON"
                      >
                        {copiedResourceId === res.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px]">JSON</span>
                          </>
                        )}
                      </button>
                      {confidenceBadge}
                      {res.status && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-emerald-600 border border-slate-200">
                          {res.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resource Specific Body */}
                  {resType === 'Patient' && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500">Legal Name:</span>
                        <strong className="text-slate-800 font-mono">
                          {res.name?.[0]?.text || 'N/A'}
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-500">MRN:</span>{' '}
                          <span className="text-sky-700 font-mono">{res.identifier?.[0]?.value || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Gender:</span>{' '}
                          <span className="capitalize text-slate-700">{res.gender || 'unknown'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">DOB:</span>{' '}
                          <span className="font-mono text-slate-700">{res.birthDate || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Telecom:</span>{' '}
                          <span className="font-mono text-slate-700">{res.telecom?.[0]?.value || 'N/A'}</span>
                        </div>
                      </div>
                      {res.address?.[0] && (
                        <div className="text-[11px] text-slate-500 pt-1">
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
                          <p className="font-semibold text-slate-800">{res.code?.text}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            LOINC: {res.code?.coding?.[0]?.code} ({res.code?.coding?.[0]?.system})
                          </p>
                        </div>

                        {/* Measured Value */}
                        <div className="text-right">
                          {res.valueQuantity ? (
                            <div className="flex items-baseline gap-1 justify-end font-mono">
                              <span className="text-base font-bold text-sky-700">
                                {res.valueQuantity.value}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">
                                {res.valueQuantity.unit}
                              </span>
                            </div>
                          ) : res.valueString ? (
                            <span className="text-xs font-mono text-sky-700 font-medium">
                              {res.valueString}
                            </span>
                          ) : res.component ? (
                            <div className="space-y-0.5 text-right font-mono text-[11px]">
                              {res.component.map((c: any, i: number) => (
                                <div key={i}>
                                  <span className="text-slate-500">{c.code?.text?.split(' ')[0]}:</span>{' '}
                                  <strong className="text-sky-700">{c.valueQuantity?.value} {c.valueQuantity?.unit}</strong>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {res.interpretation?.[0] && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono mt-1 inline-block ${
                                res.interpretation[0].coding?.[0]?.code === 'H'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : res.interpretation[0].coding?.[0]?.code === 'L'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                        <p className="font-semibold text-slate-800">{res.code?.text}</p>
                        <span className="text-[11px] font-mono text-sky-600">
                          {res.result?.length || 0} Observations linked
                        </span>
                      </div>
                      {res.conclusion && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-850">
                          "{res.conclusion}"
                        </p>
                      )}
                      {res.extension && (
                        <div className="text-[10px] text-purple-700 font-mono bg-purple-50/30 p-1.5 rounded border border-purple-200/60">
                          Custom DICOM Study Extension: {JSON.stringify(res.extension[0].extension)}
                        </div>
                      )}
                    </div>
                  )}

                  {resType === 'Encounter' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500">Class:</span>
                        <strong className="text-slate-700 capitalize">
                          {res.class?.display || 'Ambulatory'}
                        </strong>
                      </div>
                      {res.location?.[0] && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">Location:</span>
                          <span className="text-slate-600 font-mono">
                            {res.location[0].location?.display}
                          </span>
                        </div>
                      )}
                      {res.participant?.[0] && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">Attending:</span>
                          <span className="text-slate-600">
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
                        <span className="font-semibold text-slate-800">{res.code?.text}</span>
                        <span className="font-mono text-sky-700 text-[11px]">
                          ICD-10: {res.code?.coding?.[0]?.code}
                        </span>
                      </div>
                    </div>
                  )}

                  {resType === 'Coverage' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{res.payor?.[0]?.display}</span>
                        <span className="font-mono text-sky-700 text-[11px]">
                          Policy: {res.subscriberId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        ) : viewMode === 'diff' ? (
          /* Side-by-Side Diff: De-Identified Tokens vs Re-Hydrated PHI */
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-slate-800">Token Substitution Diff</span>
                <span className="text-slate-500 text-[11px]">
                  (Left: De-Identified Tokens • Right: Re-Hydrated PHI)
                </span>
              </div>
              <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {mappingResult.phi_audit?.total_redactions || 0} tokens protected
              </div>
            </div>
            <div className="flex-1">
              <DiffEditor
                height="100%"
                language="json"
                theme="light"
                original={JSON.stringify(mappingResult.fhir_bundle, null, 2)}
                modified={JSON.stringify(mappingResult.rehydrated_bundle, null, 2)}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  automaticLayout: true,
                  renderSideBySide: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        ) : viewMode === 'tree' ? (
          /* Provenance & Topology Hierarchy Tree */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
            {/* Context Header */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-sky-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Clinical Topology & Resource Provenance Graph
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Hierarchical reference graph linking clinical records to Patient, Encounter, and Service contexts
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                {entries.length} Resources Mapped
              </span>
            </div>

            {/* Tree Container */}
            <div className="space-y-4">
              {/* Level 0: Patient Root */}
              {topology.patient ? (
                <div className="bg-white rounded-xl border border-purple-200/80 p-3.5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-purple-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-purple-900">
                            Patient (Root Subject)
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            id: {topology.patient.id}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {topology.patient.name?.[0]?.family}, {topology.patient.name?.[0]?.given?.join(' ')}
                          {topology.patient.gender && (
                            <span className="ml-2 font-normal text-slate-500 capitalize text-[11px]">
                              • {topology.patient.gender}
                            </span>
                          )}
                          {topology.patient.birthDate && (
                            <span className="ml-1.5 font-mono text-slate-500 text-[11px]">
                              • DOB: {topology.patient.birthDate}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleCopySingleResource(topology.patient, e)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 transition cursor-pointer"
                        title="Copy Patient JSON"
                      >
                        {copiedResourceId === topology.patient.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span className="text-[10px]">JSON</span>
                      </button>
                      {getConfidenceBadge(topology.patient.id)}
                    </div>
                  </div>

                  {/* Level 1: Encounters & Coverage Branching from Patient */}
                  <div className="pl-4 ml-3 border-l-2 border-slate-300 space-y-4">
                    {/* Encounters */}
                    {topology.encounters.map((enc: any, encIdx: number) => (
                      <div key={encIdx} className="bg-slate-50/90 rounded-xl border border-indigo-200/80 p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-indigo-100 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Activity className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-indigo-950">
                                  Encounter ({enc.class?.code || 'Clinical Encounter'})
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  id: {enc.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                Status: <span className="font-medium capitalize">{enc.status}</span>
                                {enc.period?.start && (
                                  <span className="ml-2 font-mono text-slate-500">
                                    Period: {enc.period.start.slice(0, 16).replace('T', ' ')}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleCopySingleResource(enc, e)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-800 bg-white border border-slate-200 transition cursor-pointer"
                            >
                              {copiedResourceId === enc.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                              <span className="text-[10px]">JSON</span>
                            </button>
                            {getConfidenceBadge(enc.id)}
                          </div>
                        </div>

                        {/* Level 2: Children under this Encounter (DiagnosticReport, Observations, Conditions, Orders) */}
                        <div className="pl-4 ml-2 border-l-2 border-indigo-200 space-y-3">
                          {/* DiagnosticReports */}
                          {topology.diagnosticReports.map((dr: any, drIdx: number) => (
                            <div key={drIdx} className="bg-white rounded-lg border border-sky-200 p-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-2 border-b border-sky-100 pb-1.5">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
                                  <span className="font-semibold text-xs text-sky-950">
                                    {dr.code?.text || dr.code?.coding?.[0]?.display || 'Diagnostic Report'}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    id: {dr.id}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => handleCopySingleResource(dr, e)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5"
                                  title="Copy JSON"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Observations nested under DiagnosticReport */}
                              {topology.observations.length > 0 && (
                                <div className="space-y-1.5 pl-2">
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Associated Observations ({topology.observations.length})
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {topology.observations.map((obs: any, obsIdx: number) => {
                                      const isAbnormal = obs.interpretation?.[0]?.coding?.[0]?.code &&
                                        ['H', 'L', 'A', 'PANIC', 'CRIT'].includes(obs.interpretation[0].coding[0].code.toUpperCase());
                                      return (
                                        <div
                                          key={obsIdx}
                                          className={`p-2 rounded border text-xs flex items-center justify-between gap-2 ${
                                            isAbnormal
                                              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                                              : 'bg-slate-50/70 border-slate-200 text-slate-800'
                                          }`}
                                        >
                                          <div className="min-w-0">
                                            <p className="font-semibold truncate text-[11px]">
                                              {obs.code?.text || obs.code?.coding?.[0]?.display || 'Observation'}
                                            </p>
                                            <p className="font-mono text-[11px] font-bold text-sky-800 mt-0.5">
                                              {obs.valueQuantity ? (
                                                <>
                                                  {obs.valueQuantity.value} {obs.valueQuantity.unit}
                                                </>
                                              ) : obs.valueString ? (
                                                obs.valueString
                                              ) : (
                                                'Reported'
                                              )}
                                              {isAbnormal && (
                                                <span className="ml-1.5 px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold text-[9px]">
                                                  {obs.interpretation[0].coding[0].code}
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                          <button
                                            onClick={(e) => handleCopySingleResource(obs, e)}
                                            className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
                                            title="Copy Observation JSON"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Conditions / Diagnoses */}
                          {topology.conditions.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Diagnoses & Conditions ({topology.conditions.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {topology.conditions.map((cond: any, condIdx: number) => (
                                  <div
                                    key={condIdx}
                                    className="p-2 rounded-lg bg-amber-50/40 border border-amber-200/80 text-xs flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <Stethoscope className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span className="font-semibold text-slate-900 truncate text-[11px]">
                                          {cond.code?.text || cond.code?.coding?.[0]?.display || 'Condition'}
                                        </span>
                                      </div>
                                      <p className="font-mono text-[10px] text-amber-800 mt-0.5 pl-5">
                                        {cond.code?.coding?.[0]?.system?.includes('icd-10') ? 'ICD-10: ' : ''}
                                        {cond.code?.coding?.[0]?.code}
                                        {cond.clinicalStatus?.coding?.[0]?.code && (
                                          <span className="ml-2 font-sans font-medium text-slate-500">
                                            ({cond.clinicalStatus.coding[0].code})
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => handleCopySingleResource(cond, e)}
                                      className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Service Requests */}
                          {topology.serviceRequests.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Service Requests / Orders ({topology.serviceRequests.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {topology.serviceRequests.map((sr: any, srIdx: number) => (
                                  <div
                                    key={srIdx}
                                    className="p-2 rounded-lg bg-sky-50/40 border border-sky-200 text-xs flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-semibold text-slate-900 truncate text-[11px]">
                                        {sr.code?.text || sr.code?.coding?.[0]?.display || 'Service Request'}
                                      </span>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Intent: <span className="font-medium capitalize">{sr.intent}</span> • Priority: <span className="font-medium capitalize">{sr.priority || 'routine'}</span>
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => handleCopySingleResource(sr, e)}
                                      className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Coverage */}
                    {topology.coverages.map((cov: any, covIdx: number) => (
                      <div key={covIdx} className="bg-teal-50/50 rounded-xl border border-teal-200 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 rounded bg-teal-100 text-teal-800">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-teal-950">
                              Coverage & Health Plan: {cov.payor?.[0]?.display || 'Insurance Policy'}
                            </span>
                            <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                              Policy ID: {cov.subscriberId} • Status: {cov.status}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleCopySingleResource(cov, e)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No Patient resource detected in current bundle.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Monaco Editor JSON View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Monaco Action Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  Direct Monaco JSON Editor ({useRehydrated ? 'Re-Hydrated' : 'De-Identified'})
                </span>
                {jsonError && (
                  <span className="text-[11px] text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200">
                    Syntax Error: {jsonError}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrettify}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
                  title="Format JSON"
                >
                  Prettify
                </button>
                <button
                  onClick={handleResetJson}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
                  title="Reset to AI mapping"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
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
                theme="light"
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
