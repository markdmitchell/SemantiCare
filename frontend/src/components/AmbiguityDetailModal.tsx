import React, { useState } from 'react';
import type { AmbiguityFlag } from '../types/hl7';
import { X, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface AmbiguityDetailModalProps {
  ambiguity: AmbiguityFlag;
  onClose: () => void;
  onResolve?: (ambiguityId: string, chosenValue: string) => void;
}

export const AmbiguityDetailModal: React.FC<AmbiguityDetailModalProps> = ({
  ambiguity,
  onClose,
  onResolve,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string>(
    ambiguity.default_choice || ambiguity.suggested_options?.[0] || ''
  );
  const [resolved, setResolved] = useState(false);

  const handleApply = () => {
    if (onResolve) {
      onResolve(ambiguity.id, selectedChoice);
    }
    setResolved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{ambiguity.title}</h3>
              <p className="text-xs text-slate-400">Human-in-the-Loop Ambiguity Resolution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
              <span>Field Location: <strong className="text-cyan-400">{ambiguity.field_location}</strong></span>
              <span className="uppercase text-amber-400">{ambiguity.type}</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{ambiguity.message}</p>
          </div>

          {ambiguity.suggested_options && ambiguity.suggested_options.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                Select Clinical Resolution:
              </h4>

              <div className="space-y-2">
                {ambiguity.suggested_options.map((option) => (
                  <label
                    key={option}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition select-none ${
                      selectedChoice === option
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="choice"
                        checked={selectedChoice === option}
                        onChange={() => setSelectedChoice(option)}
                        className="text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
                      />
                      <span className="font-mono text-xs font-semibold">{option}</span>
                    </div>

                    {ambiguity.default_choice === option && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Recommended
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={resolved}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium text-xs transition"
          >
            {resolved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolved!</span>
              </>
            ) : (
              <span>Apply Resolution</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
