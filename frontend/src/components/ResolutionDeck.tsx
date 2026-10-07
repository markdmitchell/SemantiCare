import React, { useState } from 'react';
import type { AmbiguityFlag } from '../types/hl7';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Hash,
  Activity,
  Layers,
  Database,
} from 'lucide-react';
import { saveMappingRule } from '../services/api';

interface ResolutionDeckProps {
  ambiguities: AmbiguityFlag[];
  onResolve: (ambiguityId: string, resolvedValue: string) => void;
  onResetResolutions: () => void;
  facility?: string;
  onRuleLearned?: () => void;
}

export const ResolutionDeck: React.FC<ResolutionDeckProps> = ({
  ambiguities,
  onResolve,
  onResetResolutions,
  facility,
  onRuleLearned,
}) => {
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [rememberRules, setRememberRules] = useState<Record<string, boolean>>({});
  const [savedNotifications, setSavedNotifications] = useState<Record<string, string>>({});

  const unresolvedCount = ambiguities.filter((a) => !a.is_resolved).length;
  const resolvedCount = ambiguities.filter((a) => a.is_resolved).length;

  const handleChoiceChange = (ambId: string, val: string) => {
    setSelectedChoices((prev) => ({ ...prev, [ambId]: val }));
  };

  const handleApplyResolution = async (amb: AmbiguityFlag) => {
    const custom = customInputs[amb.id]?.trim();
    const chosen = custom || selectedChoices[amb.id] || amb.default_choice || amb.suggested_options?.[0] || 'Confirmed';
    
    // Check if user requested saving this resolution to persistent Mapping Memory
    if (rememberRules[amb.id] !== false && (amb.type === 'MISSING_UNIT' || amb.type === 'LOCAL_TERMINOLOGY')) {
      try {
        const sourceKey = amb.source_key || (amb.type === 'LOCAL_TERMINOLOGY' ? amb.title.match(/'([^']+)'/)?.[1] || amb.field_location : amb.field_location);
        let targetVal = chosen;
        let targetDisplay = '';
        if (chosen.includes(' - ')) {
          const parts = chosen.split(' - ');
          targetVal = parts[0].trim();
          targetDisplay = parts.slice(1).join(' - ').trim();
        }
        await saveMappingRule({
          facility: facility || '*',
          rule_type: amb.type,
          source_key: sourceKey,
          target_value: targetVal,
          target_display: targetDisplay,
          author: 'Clinical Informaticist (HITL Resolution)',
          notes: `Persisted from Resolution Deck review for ${facility || 'Global'} on ${new Date().toLocaleDateString()}`,
        });
        setSavedNotifications((prev) => ({ ...prev, [amb.id]: `Saved to Mapping Memory (${facility || '*'})` }));
        if (onRuleLearned) onRuleLearned();
      } catch (e) {
        console.error('Failed to persist rule to Mapping Memory:', e);
      }
    }

    onResolve(amb.id, chosen);
  };


  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MISSING_UNIT':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'LOCAL_TERMINOLOGY':
        return <Hash className="w-4 h-4 text-cyan-400" />;
      case 'COMPOUND_VALUE':
        return <Activity className="w-4 h-4 text-purple-400" />;
      case 'CUSTOM_Z_SEGMENT':
        return <Layers className="w-4 h-4 text-rose-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold text-sm text-slate-200">Human-in-the-Loop Clinical Resolution Deck</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {ambiguities.length} {ambiguities.length === 1 ? 'Semantic Flag' : 'Semantic Flags'}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{unresolvedCount} Pending</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{resolvedCount} Resolved</span>
            </span>
          </div>

          {resolvedCount > 0 && (
            <button
              onClick={onResetResolutions}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
              title="Reset all resolutions to AI baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content List of Ambiguities */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60">
        {ambiguities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="font-semibold text-slate-300 text-sm">No Clinical Ambiguities Detected</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              All data elements in this message were mapped with deterministic or high-confidence standard terminology.
            </p>
          </div>
        ) : (
          ambiguities.map((amb) => {
            const isResolved = !!amb.is_resolved;
            const currentChoice =
              selectedChoices[amb.id] !== undefined
                ? selectedChoices[amb.id]
                : amb.default_choice || amb.suggested_options?.[0] || '';

            return (
              <div
                key={amb.id}
                className={`border rounded-lg p-4 transition shadow-sm ${
                  isResolved
                    ? 'bg-slate-900/60 border-emerald-900/60'
                    : 'bg-slate-900 border-amber-800/60'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded border ${
                        isResolved
                          ? 'bg-emerald-950 border-emerald-800'
                          : 'bg-amber-950 border-amber-800'
                      }`}
                    >
                      {isResolved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        getTypeIcon(amb.type)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-400 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900">
                          {amb.field_location}
                        </span>
                        <h3 className="font-semibold text-slate-200 text-xs">{amb.title}</h3>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isResolved ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {amb.resolved_by || 'Verified by Informaticist'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        Action Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Message / Description */}
                <p className="text-slate-300 text-xs pt-2.5 leading-relaxed">{amb.message}</p>

                {/* Resolution Interactive Body */}
                <div className="mt-3 pt-3 border-t border-slate-850">
                  {isResolved ? (
                    <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">Applied Value:</span>
                        <code className="text-emerald-300 font-mono font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                          {amb.resolved_value}
                        </code>
                        {amb.resolved_by && (
                          <span className="text-[10px] text-emerald-400/80 italic">
                            ({amb.resolved_by})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onResolve(amb.id, '')}
                        className="text-[11px] text-slate-400 hover:text-white underline"
                      >
                        Change Resolution
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {amb.suggested_options && amb.suggested_options.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                            Select Candidate or Standard Definition:
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {amb.suggested_options.map((opt) => {
                              const isSelected = currentChoice === opt;
                              const isDefault = amb.default_choice === opt;

                              return (
                                <label
                                  key={opt}
                                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                    isSelected
                                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200'
                                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`opt-${amb.id}`}
                                      checked={isSelected}
                                      onChange={() => handleChoiceChange(amb.id, opt)}
                                      className="text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
                                    />
                                    <span className="font-mono text-xs">{opt}</span>
                                  </div>

                                  {isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                      Default
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom write-in for units or codes */}
                      {amb.type === 'MISSING_UNIT' && (
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-slate-400 text-[11px]">Or custom UCUM unit:</span>
                          <input
                            type="text"
                            placeholder="e.g. g, oz, mmol/L..."
                            value={customInputs[amb.id] || ''}
                            onChange={(e) =>
                              setCustomInputs((prev) => ({ ...prev, [amb.id]: e.target.value }))
                            }
                            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 w-36"
                          />
                        </div>
                      )}

                      {/* Apply Resolution Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        {(amb.type === 'MISSING_UNIT' || amb.type === 'LOCAL_TERMINOLOGY') ? (
                          <label className="flex items-center gap-2 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rememberRules[amb.id] !== false}
                              onChange={(e) =>
                                setRememberRules((prev) => ({ ...prev, [amb.id]: e.target.checked }))
                              }
                              className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="flex items-center gap-1.5 text-xs text-slate-300">
                              <Database className="w-3 h-3 text-emerald-400" />
                              <span>Remember in Mapping Memory for </span>
                              <span className="font-semibold text-emerald-300 font-mono">
                                {facility || '* (Global)'}
                              </span>
                            </span>
                          </label>
                        ) : <div />}

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {savedNotifications[amb.id] && (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {savedNotifications[amb.id]}
                            </span>
                          )}
                          <button
                            onClick={() => handleApplyResolution(amb)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950/50 transition active:scale-[0.98]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Apply & Update FHIR Resource</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
