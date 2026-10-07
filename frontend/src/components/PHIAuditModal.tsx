import React from 'react';
import type { PHIAudit } from '../types/hl7';
import { X, ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react';

interface PHIAuditModalProps {
  audit: PHIAudit;
  onClose: () => void;
}

export const PHIAuditModal: React.FC<PHIAuditModalProps> = ({ audit, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Zero-Trust PHI Redaction Audit</h3>
              <p className="text-xs text-slate-500">Local Pre-Flight De-Identification Summary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Security Guarantee Card */}
          <div className="bg-gradient-to-r from-emerald-100/40 to-teal-100/40 border border-emerald-200/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>HIPAA Safe Harbor Compliance Guarantee</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              All Protected Health Information (PHI) was detected and replaced with synthetic reversible tokens <strong>prior to semantic translation</strong>. The AI mapping engine operates strictly on tokenized values with zero exposure to identifiable patient data.
            </p>
            <div className="flex items-center gap-4 text-emerald-600 text-[11px] pt-1 font-mono">
              <span>Total Entities Redacted: <strong>{audit.total_redactions}</strong></span>
              <span>•</span>
              <span>Reversible Vault: <strong>Active (In-Memory Ephemeral)</strong></span>
            </div>
          </div>

          {/* Breakdown by Entity Type */}
          <div>
            <h4 className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-sky-600" />
              Entities Redacted by Category
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(audit.entity_breakdown).map(([type, count]) => (
                <div key={type} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[11px] truncate">{type}</span>
                  <span className="font-mono text-sky-700 font-bold bg-sky-50/80 px-2 py-0.5 rounded border border-sky-200 text-xs">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Entity Table */}
          <div>
            <h4 className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Redaction Audit Log
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-x-auto bg-slate-50 max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-500 font-medium">
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Synthetic Token</th>
                    <th className="p-2.5">Masked Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                  {audit.entities.map((e, idx) => (
                    <tr key={idx} className="hover:bg-white/60 transition text-slate-600">
                      <td className="p-2.5 text-sky-600">{e.location}</td>
                      <td className="p-2.5 text-slate-500">{e.entity_type}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">{e.token}</td>
                      <td className="p-2.5 text-slate-500">{e.preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
