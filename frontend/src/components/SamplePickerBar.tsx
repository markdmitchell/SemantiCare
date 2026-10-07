import React from 'react';
import type { HL7Sample } from '../types/hl7';
import { Sparkles, FileText, FlaskConical, AlertTriangle, Layers } from 'lucide-react';

interface SamplePickerBarProps {
  samples: HL7Sample[];
  selectedSampleId: string;
  onSelectSample: (sample: HL7Sample) => void;
}

export const SamplePickerBar: React.FC<SamplePickerBarProps> = ({
  samples,
  selectedSampleId,
  onSelectSample,
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Demographics & Encounter':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'Diagnostic & Laboratory':
        return <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Ambiguity Resolution (HITL)':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'Custom Z-Segments':
        return <Layers className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-sky-600" />;
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Curated Clinical Scenarios:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {samples.map((sample) => {
            const isSelected = sample.id === selectedSampleId;
            return (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-500 text-sky-700 shadow-sm shadow-sky-200/40'
                    : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
                title={sample.description}
              >
                {getCategoryIcon(sample.category)}
                <span>{sample.title.split(' - ')[0]}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  {sample.category.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
