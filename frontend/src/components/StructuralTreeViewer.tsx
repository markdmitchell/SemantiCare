import React, { useState } from 'react';
import type { HL7Segment, HL7Metadata, HL7Field } from '../types/hl7';
import {
  FolderTree,
  Table,
  FileCode,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Copy,
  Check,
  Eye,
} from 'lucide-react';

interface StructuralTreeViewerProps {
  segments: HL7Segment[];
  metadata?: HL7Metadata;
  onSelectField?: (segment: HL7Segment, field: HL7Field) => void;
}

export const StructuralTreeViewer: React.FC<StructuralTreeViewerProps> = ({
  segments,
  metadata,
  onSelectField,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'table' | 'json'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<string>('ALL');
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [jsonCopied, setJsonCopied] = useState(false);

  // Initialize all segments as expanded by default if under 15
  React.useEffect(() => {
    if (segments.length > 0 && Object.keys(expandedSegments).length === 0) {
      const initial: Record<string, boolean> = {};
      segments.forEach((s) => {
        initial[s.unique_id] = true;
      });
      setExpandedSegments(initial);
    }
  }, [segments]);

  const toggleSegment = (uid: string) => {
    setExpandedSegments((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const toggleField = (fieldUid: string) => {
    setExpandedFields((prev) => ({ ...prev, [fieldUid]: !prev[fieldUid] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    segments.forEach((s) => {
      all[s.unique_id] = true;
      s.fields.forEach((f) => {
        all[`${s.unique_id}_f${f.field_index}`] = true;
      });
    });
    setExpandedSegments(all);
    setExpandedFields(all);
  };

  const collapseAll = () => {
    setExpandedSegments({});
    setExpandedFields({});
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify({ metadata, segments }, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  // Color mapping based on HL7 segment domain
  const getSegmentBadgeStyle = (segId: string, isCustom: boolean) => {
    if (isCustom || segId.startsWith('Z')) {
      return 'bg-rose-950/80 text-rose-300 border-rose-800';
    }
    switch (segId) {
      case 'MSH':
      case 'EVN':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'PID':
      case 'NK1':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'PV1':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      case 'ORC':
      case 'OBR':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      case 'OBX':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'NTE':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'DG1':
      case 'AL1':
        return 'bg-orange-950/80 text-orange-300 border-orange-800';
      case 'IN1':
        return 'bg-teal-950/80 text-teal-300 border-teal-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Unique segment types for quick filter pills
  const uniqueSegmentTypes = Array.from(new Set(segments.map((s) => s.segment_id)));

  // Filter segments based on search query and segment type
  const filteredSegments = segments.filter((seg) => {
    const matchesType = filterSegment === 'ALL' || seg.segment_id === filterSegment;
    if (!matchesType) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const inSegName = seg.segment_id.toLowerCase().includes(query);
    const inTitle = seg.title.toLowerCase().includes(query);
    const inRaw = seg.raw.toLowerCase().includes(query);
    const inFields = seg.fields.some(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.raw_value.toLowerCase().includes(query) ||
        f.type.toLowerCase().includes(query)
    );

    return inSegName || inTitle || inRaw || inFields;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header & View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-sm text-slate-200">Structural Parse Tree</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            {filteredSegments.length} of {segments.length} segments
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              activeTab === 'tree'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Tree View</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              activeTab === 'table'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              activeTab === 'json'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON Inspector</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fields, codes, or values..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        {/* Quick Filter Segment Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setFilterSegment('ALL')}
            className={`text-[11px] px-2 py-1 rounded border transition whitespace-nowrap ${
              filterSegment === 'ALL'
                ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Segments ({segments.length})
          </button>
          {uniqueSegmentTypes.map((type) => {
            const count = segments.filter((s) => s.segment_id === type).length;
            const isCustom = type.startsWith('Z');
            return (
              <button
                key={type}
                onClick={() => setFilterSegment(type)}
                className={`text-[11px] px-2 py-1 rounded border font-mono transition whitespace-nowrap ${
                  filterSegment === type
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                    : isCustom
                    ? 'bg-rose-950/30 border-rose-900/50 text-rose-300 hover:bg-rose-900/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {type} {count > 1 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>

        {activeTab === 'tree' && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <button
              onClick={expandAll}
              className="text-slate-400 hover:text-slate-200 underline text-[11px]"
            >
              Expand All
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={collapseAll}
              className="text-slate-400 hover:text-slate-200 underline text-[11px]"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950/60">
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
            <Layers className="w-12 h-12 text-slate-700 mb-3" />
            <p className="font-medium text-slate-400">No message parsed yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Paste an HL7 v2 message on the left or click a clinical scenario above to see the structural breakdown.
            </p>
          </div>
        ) : activeTab === 'tree' ? (
          /* Tree View */
          <div className="space-y-3">
            {filteredSegments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No segments match the filter "{searchQuery}".
              </div>
            ) : (
              filteredSegments.map((seg) => {
                const isExpanded = !!expandedSegments[seg.unique_id];
                const badgeStyle = getSegmentBadgeStyle(seg.segment_id, seg.is_custom);
                const populatedFields = seg.fields.filter((f) => f.raw_value.trim().length > 0);

                return (
                  <div
                    key={seg.unique_id}
                    className="border border-slate-800 rounded-lg bg-slate-900/80 overflow-hidden shadow-sm hover:border-slate-700 transition"
                  >
                    {/* Segment Header */}
                    <div
                      onClick={() => toggleSegment(seg.unique_id)}
                      className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 cursor-pointer select-none border-b border-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>

                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded border ${badgeStyle}`}
                        >
                          {seg.segment_id}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200">
                              {seg.title}
                            </span>
                            {seg.is_custom && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-semibold">
                                Proprietary Z-Segment
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{seg.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {populatedFields.length} populated fields
                        </span>
                      </div>
                    </div>

                    {/* Segment Body: Fields Tree */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-950/70 divide-y divide-slate-850">
                        {/* Raw Segment Text Bar */}
                        <div className="pb-2.5 mb-2.5 text-[11px] font-mono text-slate-400 break-all bg-slate-900/60 p-2 rounded border border-slate-850">
                          <span className="text-slate-500 select-none mr-2 font-semibold">RAW:</span>
                          {seg.raw}
                        </div>

                        {/* Fields List */}
                        <div className="space-y-2 pt-1">
                          {populatedFields.map((field) => {
                            const fieldUid = `${seg.unique_id}_f${field.field_index}`;
                            const isFieldExpanded = !!expandedFields[fieldUid];
                            const hasComponents =
                              field.repetitions.length > 0 &&
                              field.repetitions.some((r) => r.components.length > 1);

                            return (
                              <div
                                key={field.field_index}
                                className="bg-slate-900/90 rounded border border-slate-800/80 p-2.5 hover:border-slate-700 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    {hasComponents ? (
                                      <button
                                        onClick={() => toggleField(fieldUid)}
                                        className="text-slate-400 hover:text-cyan-400"
                                      >
                                        {isFieldExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    ) : (
                                      <div className="w-3.5" />
                                    )}

                                    <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-900">
                                      {seg.segment_id}-{field.field_index}
                                    </span>

                                    <span className="text-xs font-medium text-slate-200">
                                      {field.name}
                                    </span>

                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                      {field.type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 ml-5 sm:ml-0">
                                    <span className="font-mono text-xs text-slate-100 bg-slate-950 px-2 py-0.5 rounded border border-slate-850 break-all select-all">
                                      {field.raw_value}
                                    </span>

                                    {onSelectField && (
                                      <button
                                        onClick={() => onSelectField(seg, field)}
                                        className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800 transition"
                                        title="Inspect HL7 specification and FHIR target"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Component Decomposition (if expanded) */}
                                {isFieldExpanded && hasComponents && (
                                  <div className="mt-2.5 ml-6 pl-3 border-l-2 border-slate-800 space-y-1.5 text-xs">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                      Decomposed Sub-Components:
                                    </p>
                                    {field.repetitions.map((rep, rIdx) => (
                                      <div key={rIdx} className="space-y-1">
                                        {field.repetitions.length > 1 && (
                                          <span className="text-[10px] text-emerald-400 font-mono">
                                            [Repetition {rep.repetition_index}]
                                          </span>
                                        )}
                                        {rep.components.map((comp) => (
                                          <div
                                            key={comp.component_index}
                                            className="flex items-center justify-between bg-slate-950/80 px-2.5 py-1 rounded border border-slate-850"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-slate-500 font-mono text-[10px]">
                                                .{comp.component_index}
                                              </span>
                                              <span className="text-slate-300 text-xs">
                                                {comp.name}
                                              </span>
                                            </div>
                                            <span className="font-mono text-xs text-cyan-200 font-medium">
                                              {comp.value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'table' ? (
          /* Table View */
          <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-900/90">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="p-3 w-16">#</th>
                  <th className="p-3 w-24">Segment</th>
                  <th className="p-3 w-48">Standard Title</th>
                  <th className="p-3">Populated Data Elements</th>
                  <th className="p-3 w-28 text-right">Fields</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredSegments.map((seg, idx) => {
                  const populated = seg.fields.filter((f) => f.raw_value.trim().length > 0);
                  const preview = populated
                    .slice(0, 3)
                    .map((f) => `${f.name}: "${f.raw_value}"`)
                    .join(' | ');

                  return (
                    <tr key={seg.unique_id} className="hover:bg-slate-850/60 transition">
                      <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] ${getSegmentBadgeStyle(
                            seg.segment_id,
                            seg.is_custom
                          )}`}
                        >
                          {seg.segment_id}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-200">{seg.title}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-md">
                        {preview}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {populated.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* JSON Inspector View */
          <div className="relative h-full flex flex-col">
            <div className="flex justify-between items-center pb-2">
              <span className="text-xs text-slate-400">
                Complete annotated AST for downstream LLM mapping pipelines
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                {jsonCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{jsonCopied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="flex-1 p-3 bg-slate-950 text-slate-300 font-mono text-xs rounded-lg border border-slate-800 overflow-auto leading-relaxed select-all">
              {JSON.stringify({ metadata, segments }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
