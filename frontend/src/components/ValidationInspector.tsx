import React, { useState } from 'react';
import { AIValidationAssistant } from './AIValidationAssistant';
import type { ValidationResult } from '../types/hl7';
import {
  CheckCircle2,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

interface ValidationInspectorProps {
  validationResult: ValidationResult | null;
  loading: boolean;
  selectedProfile: string;
  onProfileChange: (profile: string) => void;
  onRevalidate: () => void;
}

export const ValidationInspector: React.FC<ValidationInspectorProps> = ({
  validationResult,
  loading,
  selectedProfile,
  onProfileChange,
  onRevalidate,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ERROR' | 'WARNING'>('ALL');

  if (!validationResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
        <FileCheck className="w-12 h-12 text-slate-700 mb-3" />
        <p className="font-semibold text-slate-600">No Validation Results Yet</p>
        <p className="text-slate-500 mt-1 max-w-sm">
          Map an HL7 message to FHIR R4 to trigger schema and US Core conformance checking.
        </p>
      </div>
    );
  }

  const { issues, issues_summary, conformance_score, total_resources_checked, valid_resources_count, is_valid } = validationResult;

  const filteredIssues = issues.filter((iss) => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'ERROR') return iss.severity === 'error';
    if (filterSeverity === 'WARNING') return iss.severity === 'warning';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-sky-600" />
          <h2 className="font-semibold text-sm text-slate-700">FHIR R4 & US Core Conformance Validator</h2>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              is_valid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {is_valid ? 'Schema Valid' : 'Schema Violations'}
          </span>
        </div>

        {/* Profile Switcher & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
          <AIValidationAssistant result={validationResult} profile={selectedProfile} />
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onProfileChange('us-core')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                selectedProfile === 'us-core'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              US Core 3.1.1 / 6.1.0
            </button>
            <button
              onClick={() => onProfileChange('base')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                selectedProfile === 'base'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Base FHIR R4
            </button>
          </div>

          <button
            onClick={onRevalidate}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
            title="Re-run Conformance Validation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/50 border-b border-slate-200 text-xs">
        {/* Conformance Score */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 text-[11px] block">Conformance Score</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-xl font-bold font-mono ${
                conformance_score >= 90
                  ? 'text-emerald-600'
                  : conformance_score >= 70
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {conformance_score}%
            </span>
            <span className="text-[10px] text-slate-500">profile score</span>
          </div>
        </div>

        {/* Resources Passed */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 text-[11px] block">Resources Passed</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-emerald-700">
              {valid_resources_count} / {total_resources_checked}
            </span>
            <span className="text-[10px] text-slate-500">entries</span>
          </div>
        </div>

        {/* Errors */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 text-[11px] block">Errors (Base Specs)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-xl font-bold font-mono ${
                issues_summary.errors > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-500'
              }`}
            >
              {issues_summary.errors}
            </span>
            <span className="text-[10px] text-slate-500">blocking</span>
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 text-[11px] block">Warnings (IG Guidance)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-xl font-bold font-mono ${
                issues_summary.warnings > 0 ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {issues_summary.warnings}
            </span>
            <span className="text-[10px] text-slate-500">recommended</span>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-4 py-2 bg-slate-50/30 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] border transition ${
              filterSeverity === 'ALL'
                ? 'bg-sky-50 border-sky-600 text-sky-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            All Issues ({issues.length})
          </button>
          <button
            onClick={() => setFilterSeverity('ERROR')}
            className={`px-2 py-0.5 rounded text-[11px] border transition ${
              filterSeverity === 'ERROR'
                ? 'bg-rose-50 border-rose-600 text-rose-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            Errors Only ({issues_summary.errors})
          </button>
          <button
            onClick={() => setFilterSeverity('WARNING')}
            className={`px-2 py-0.5 rounded text-[11px] border transition ${
              filterSeverity === 'WARNING'
                ? 'bg-amber-50 border-amber-600 text-amber-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            Warnings Only ({issues_summary.warnings})
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Profile: {selectedProfile.toUpperCase()}
        </span>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/60">
        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="font-semibold text-slate-700 text-sm">Full Conformance Achieved</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No schema violations or conformance warnings detected for the selected profile.
            </p>
          </div>
        ) : (
          filteredIssues.map((iss, idx) => {
            const isError = iss.severity === 'error';
            const isWarning = iss.severity === 'warning';

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs transition ${
                  isError
                    ? 'bg-rose-50/20 border-rose-200/60'
                    : isWarning
                    ? 'bg-amber-50/20 border-amber-200/60'
                    : 'bg-sky-50/20 border-sky-200/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase font-mono ${
                        isError
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isWarning
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {iss.severity}
                    </span>

                    <span className="font-mono text-xs text-slate-700 font-medium">
                      {iss.resource_type} ({iss.resource_id})
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {iss.rule}
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">{iss.message}</p>

                <div className="mt-2 pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Location: <code className="text-sky-700">{iss.location}</code></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
