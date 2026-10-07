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
      return 'bg-rose-50/80 text-rose-700 border-rose-200';
    }
    switch (segId) {
      case 'MSH':
      case 'EVN':
        return 'bg-blue-50/80 text-blue-700 border-blue-200';
      case 'PID':
      case 'NK1':
        return 'bg-purple-50/80 text-purple-700 border-purple-200';
      case 'PV1':
        return 'bg-indigo-50/80 text-indigo-700 border-indigo-200';
      case 'ORC':
      case 'OBR':
        return 'bg-sky-50/80 text-sky-700 border-sky-200';
      case 'OBX':
        return 'bg-emerald-50/80 text-emerald-700 border-emerald-200';
      case 'NTE':
        return 'bg-amber-50/80 text-amber-700 border-amber-200';
      case 'DG1':
      case 'AL1':
        return 'bg-orange-50/80 text-orange-700 border-orange-200';
      case 'IN1':
        return 'bg-teal-50/80 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
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
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header & View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-sky-600" />
          <h2 className="font-semibold text-sm text-slate-700">Structural Parse Tree</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-mono">
            {filteredSegments.length} of {segments.length} segments
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              activeTab === 'tree'
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Tree View</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              activeTab === 'table'
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              activeTab === 'json'
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON Inspector</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-50/40 border-b border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fields, codes, or values..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
          />
        </div>

        {/* Quick Filter Segment Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setFilterSegment('ALL')}
            className={`text-[11px] px-2 py-1 rounded border transition whitespace-nowrap ${
              filterSegment === 'ALL'
                ? 'bg-sky-50 border-sky-600 text-sky-700'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
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
                    ? 'bg-sky-50 border-sky-600 text-sky-700'
                    : isCustom
                    ? 'bg-rose-50/30 border-rose-200/50 text-rose-700 hover:bg-rose-100/40'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
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
              className="text-slate-500 hover:text-slate-700 underline text-[11px]"
            >
              Expand All
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={collapseAll}
              className="text-slate-500 hover:text-slate-700 underline text-[11px]"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/60">
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
            <Layers className="w-12 h-12 text-slate-700 mb-3" />
            <p className="font-medium text-slate-500">No message parsed yet</p>
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
                    className="border border-slate-200 rounded-lg bg-white/80 overflow-hidden shadow-sm hover:border-slate-200 transition"
                  >
                    {/* Segment Header */}
                    <div
                      onClick={() => toggleSegment(seg.unique_id)}
                      className="flex items-center justify-between p-3 bg-white hover:bg-slate-850 cursor-pointer select-none border-b border-slate-200/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-sky-600" />
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
                            <span className="text-xs font-semibold text-slate-700">
                              {seg.title}
                            </span>
                            {seg.is_custom && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                                Proprietary Z-Segment
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{seg.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                          {populatedFields.length} populated fields
                        </span>
                      </div>
                    </div>

                    {/* Segment Body: Fields Tree */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-50/70 divide-y divide-slate-850">
                        {/* Raw Segment Text Bar */}
                        <div className="pb-2.5 mb-2.5 text-[11px] font-mono text-slate-500 break-all bg-white/60 p-2 rounded border border-slate-850">
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
                                className="bg-white/90 rounded border border-slate-200/80 p-2.5 hover:border-slate-200 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    {hasComponents ? (
                                      <button
                                        onClick={() => toggleField(fieldUid)}
                                        className="text-slate-500 hover:text-sky-600"
                                      >
                                        {isFieldExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-sky-600" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    ) : (
                                      <div className="w-3.5" />
                                    )}

                                    <span className="font-mono text-xs font-semibold text-sky-600 bg-sky-50/60 px-1.5 py-0.5 rounded border border-sky-200">
                                      {seg.segment_id}-{field.field_index}
                                    </span>

                                    <span className="text-xs font-medium text-slate-700">
                                      {field.name}
                                    </span>

                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                      {field.type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 ml-5 sm:ml-0">
                                    <span className="font-mono text-xs text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-850 break-all select-all">
                                      {field.raw_value}
                                    </span>

                                    {onSelectField && (
                                      <button
                                        onClick={() => onSelectField(seg, field)}
                                        className="p-1 text-slate-500 hover:text-sky-600 rounded hover:bg-slate-100 transition"
                                        title="Inspect HL7 specification and FHIR target"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Component Decomposition (if expanded) */}
                                {isFieldExpanded && hasComponents && (
                                  <div className="mt-2.5 ml-6 pl-3 border-l-2 border-slate-200 space-y-1.5 text-xs">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                      Decomposed Sub-Components:
                                    </p>
                                    {field.repetitions.map((rep, rIdx) => (
                                      <div key={rIdx} className="space-y-1">
                                        {field.repetitions.length > 1 && (
                                          <span className="text-[10px] text-emerald-600 font-mono">
                                            [Repetition {rep.repetition_index}]
                                          </span>
                                        )}
                                        {rep.components.map((comp) => (
                                          <div
                                            key={comp.component_index}
                                            className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1 rounded border border-slate-850"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-slate-500 font-mono text-[10px]">
                                                .{comp.component_index}
                                              </span>
                                              <span className="text-slate-600 text-xs">
                                                {comp.name}
                                              </span>
                                            </div>
                                            <span className="font-mono text-xs text-sky-700 font-medium">
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
          <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white/90">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="p-3 w-16">#</th>
                  <th className="p-3 w-24">Segment</th>
                  <th className="p-3 w-48">Standard Title</th>
                  <th className="p-3">Populated Data Elements</th>
                  <th className="p-3 w-28 text-right">Fields</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-600">
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
                      <td className="p-3 font-medium text-slate-700">{seg.title}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 truncate max-w-md">
                        {preview}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
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
              <span className="text-xs text-slate-500">
                Complete annotated AST for downstream LLM mapping pipelines
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
              >
                {jsonCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{jsonCopied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="flex-1 p-3 bg-slate-50 text-slate-600 font-mono text-xs rounded-lg border border-slate-200 overflow-auto leading-relaxed select-all">
              {JSON.stringify({ metadata, segments }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
