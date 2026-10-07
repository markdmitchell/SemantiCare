import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Plus,
  Trash2,
  Download,
  Filter,
  Search,
  CheckCircle2,
  RefreshCw,
  Building2,
  Sparkles,
  Info,
  Clock,
  UserCheck
} from 'lucide-react';
import type { MappingRule } from '../types/hl7';
import { fetchMappingRules, saveMappingRule, deleteMappingRule, exportRulesConceptMap } from '../services/api';

interface InstitutionalRulesModalProps {
  onClose: () => void;
  onRulesUpdated?: () => void;
}

export const InstitutionalRulesModal: React.FC<InstitutionalRulesModalProps> = ({
  onClose,
  onRulesUpdated,
}) => {
  const [rules, setRules] = useState<MappingRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Rule Form State
  const [formFacility, setFormFacility] = useState<string>('*');
  const [formRuleType, setFormRuleType] = useState<string>('LOCAL_TERMINOLOGY');
  const [formSourceKey, setFormSourceKey] = useState<string>('');
  const [formTargetValue, setFormTargetValue] = useState<string>('');
  const [formTargetDisplay, setFormTargetDisplay] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState<string>('Clinical Informaticist');
  const [formNotes, setFormNotes] = useState<string>('');

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetchMappingRules();
      setRules(res.rules || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
      setStatusMessage({ text: 'Failed to load rules from server.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSourceKey.trim() || !formTargetValue.trim()) {
      setStatusMessage({ text: 'Source code and target value are required.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      await saveMappingRule({
        facility: formFacility.trim() || '*',
        rule_type: formRuleType,
        source_key: formSourceKey.trim(),
        target_value: formTargetValue.trim(),
        target_display: formTargetDisplay.trim(),
        author: formAuthor.trim() || 'Clinical Informaticist',
        notes: formNotes.trim(),
      });

      setStatusMessage({ text: 'Institutional mapping rule saved successfully!', type: 'success' });
      setIsAdding(false);
      // Reset form
      setFormSourceKey('');
      setFormTargetValue('');
      setFormTargetDisplay('');
      setFormNotes('');
      await loadRules();
      if (onRulesUpdated) onRulesUpdated();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to save rule.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this institutional rule?')) return;
    setDeletingId(ruleId);
    try {
      await deleteMappingRule(ruleId);
      setStatusMessage({ text: 'Rule deleted successfully.', type: 'success' });
      await loadRules();
      if (onRulesUpdated) onRulesUpdated();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to delete rule.', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportConceptMap = async () => {
    try {
      const conceptMap = await exportRulesConceptMap();
      const blob = new Blob([JSON.stringify(conceptMap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `semanticare-conceptmap-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'FHIR ConceptMap exported successfully!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to export ConceptMap.', type: 'error' });
    }
  };

  // Distinct facilities for filtering
  const distinctFacilities = Array.from(new Set(rules.map((r) => r.facility))).sort();

  // Filtered list
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.source_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.target_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.target_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFacility = facilityFilter === 'ALL' || r.facility === facilityFilter;
    const matchesType = typeFilter === 'ALL' || r.rule_type === typeFilter;

    return matchesSearch && matchesFacility && matchesType;
  });

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'MISSING_UNIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Unit Normalization
          </span>
        );
      case 'LOCAL_TERMINOLOGY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Terminology (LOINC)
          </span>
        );
      case 'CUSTOM_Z_SEGMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Z-Segment Mapping
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">Institutional Mapping Memory & Rulebase</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {rules.length} Active Rules
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-400">
                  SQLite ACID
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional knowledge base persisted across sessions. Groundings and unit defaults auto-resolve matching future messages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 flex items-center justify-between text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-b border-emerald-800/40'
                : 'bg-rose-950/60 text-rose-300 border-b border-rose-800/40'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-200 ml-4 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Toolbar & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search local code, LOINC, unit, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Facility Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Facilities</option>
                <option value="*">Global (*)</option>
                {distinctFacilities
                  .filter((f) => f !== '*')
                  .map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Rule Types</option>
                <option value="LOCAL_TERMINOLOGY">Local Terminology</option>
                <option value="MISSING_UNIT">Unit Normalization</option>
                <option value="CUSTOM_Z_SEGMENT">Custom Z-Segments</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isAdding
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {isAdding ? 'Cancel' : 'Add Rule'}
            </button>

            <button
              onClick={handleExportConceptMap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Download standard FHIR R4 ConceptMap Resource JSON"
            >
              <Download className="w-3.5 h-3.5" />
              Export ConceptMap
            </button>

            <button
              onClick={loadRules}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh Rulebase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Add Rule Form Drawer / Dropdown */}
        {isAdding && (
          <form
            onSubmit={handleSaveRule}
            className="p-5 border-b border-emerald-500/20 bg-emerald-950/20 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-150"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sending Facility (MSH-4)
              </label>
              <input
                type="text"
                placeholder="e.g. METRO_HEALTH or * (Global)"
                value={formFacility}
                onChange={(e) => setFormFacility(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-500">Use '*' to apply across all facilities.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Rule Category</label>
              <select
                value={formRuleType}
                onChange={(e) => setFormRuleType(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="LOCAL_TERMINOLOGY">Local Terminology (Grounding to LOINC)</option>
                <option value="MISSING_UNIT">Missing Unit Default (UCUM)</option>
                <option value="CUSTOM_Z_SEGMENT">Custom Z-Segment Extraction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Source Key / Local Code
              </label>
              <input
                type="text"
                placeholder="e.g. BP_LOCAL or 29463-7"
                value={formSourceKey}
                onChange={(e) => setFormSourceKey(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Standard Value
              </label>
              <input
                type="text"
                placeholder="e.g. 85354-9 or kg"
                value={formTargetValue}
                onChange={(e) => setFormTargetValue(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Standard Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Blood pressure panel or Kilograms"
                value={formTargetDisplay}
                onChange={(e) => setFormTargetDisplay(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Informaticist / Author</label>
              <input
                type="text"
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Governance Notes / Rationale
              </label>
              <input
                type="text"
                placeholder="e.g. Calibrated bedside telemetry monitor protocol standard."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Save Rule
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Rules Table / Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <p className="text-xs">Loading institutional rules repository...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-800 rounded-xl p-8">
              <div className="p-3 bg-slate-800/50 rounded-full text-slate-500 mb-3">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No matching institutional rules</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchTerm || facilityFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'No rules match the selected filter criteria. Try resetting filters.'
                  : 'No rules have been learned yet. Resolve ambiguous messages in the Resolution Deck to populate this memory.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 rounded-lg p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getRuleTypeBadge(rule.rule_type)}

                      {/* Facility Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        <Building2 className="w-3 h-3 text-emerald-400" />
                        {rule.facility === '*' ? 'Global (*)' : rule.facility}
                      </span>

                      {/* Usage counter badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        <Sparkles className="w-3 h-3" />
                        Applied {rule.applied_count}×
                      </span>

                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rule.created_at ? new Date(rule.created_at).toLocaleDateString() : 'Active'}
                      </span>
                    </div>

                    {/* Mapping Expression */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-semibold text-slate-200 px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                        {rule.source_key}
                      </span>
                      <span className="text-emerald-400 font-bold">→</span>
                      <span className="font-mono font-semibold text-emerald-300 px-2 py-0.5 bg-emerald-950/50 rounded border border-emerald-800/40">
                        {rule.target_value}
                      </span>
                      {rule.target_display && (
                        <span className="text-xs text-slate-400 italic">
                          ({rule.target_display})
                        </span>
                      )}
                    </div>

                    {/* Notes & Author */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {rule.notes && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Info className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          {rule.notes}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <UserCheck className="w-3 h-3" />
                        {rule.author}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      disabled={deletingId === rule.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                      title="Delete rule"
                    >
                      {deletingId === rule.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Learning engine active • Auto-applies to matching HL7 messages</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
