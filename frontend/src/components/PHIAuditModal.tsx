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
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Zero-Trust PHI Redaction Audit</h3>
              <p className="text-xs text-slate-400">Local Pre-Flight De-Identification Summary</p>
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
          {/* Security Guarantee Card */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-800/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>HIPAA Safe Harbor Compliance Guarantee</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              All Protected Health Information (PHI) was detected and replaced with synthetic reversible tokens <strong>prior to semantic translation</strong>. The AI mapping engine operates strictly on tokenized values with zero exposure to identifiable patient data.
            </p>
            <div className="flex items-center gap-4 text-emerald-400 text-[11px] pt-1 font-mono">
              <span>Total Entities Redacted: <strong>{audit.total_redactions}</strong></span>
              <span>•</span>
              <span>Reversible Vault: <strong>Active (In-Memory Ephemeral)</strong></span>
            </div>
          </div>

          {/* Breakdown by Entity Type */}
          <div>
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
              Entities Redacted by Category
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(audit.entity_breakdown).map(([type, count]) => (
                <div key={type} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-mono text-[11px] truncate">{type}</span>
                  <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900 text-xs">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Entity Table */}
          <div>
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Redaction Audit Log
            </h4>
            <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950 max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Synthetic Token</th>
                    <th className="p-2.5">Masked Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                  {audit.entities.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 transition text-slate-300">
                      <td className="p-2.5 text-cyan-400">{e.location}</td>
                      <td className="p-2.5 text-slate-400">{e.entity_type}</td>
                      <td className="p-2.5 text-emerald-300 font-bold">{e.token}</td>
                      <td className="p-2.5 text-slate-500">{e.preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
