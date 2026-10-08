import React, { useState } from 'react';
import type { HL7Segment } from '../types/hl7';
import { FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';

const f = (s: HL7Segment, i: number, c?: number) => {
  const fl = s.fields.find((x) => x.field_index === i);
  if (!fl) return '';
  if (c === undefined) return fl.raw_value || '';
  return fl.repetitions[0]?.components.find((x) => x.component_index === c)?.value || '';
};

const flagStyle = (flag: string) =>
  /^(H|HH|>)$/.test(flag) ? 'bg-rose-50 text-rose-700 border-rose-200'
  : /^(L|LL|<)$/.test(flag) ? 'bg-sky-50 text-sky-700 border-sky-200'
  : /^A/.test(flag) ? 'bg-amber-50 text-amber-700 border-amber-200'
  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

const flagLabel: Record<string, string> = { H: 'High', HH: 'Critical high', L: 'Low', LL: 'Critical low', A: 'Abnormal', N: 'Normal' };

/** Position of a numeric value within its reference range, 0..1 (clamped). */
const rangePos = (val: string, range: string) => {
  const v = parseFloat(val);
  const m = range.match(/(-?[\d.]+)\s*-\s*(-?[\d.]+)/);
  if (isNaN(v) || !m) return null;
  const lo = +m[1], hi = +m[2];
  const span = hi - lo || 1;
  return Math.max(0, Math.min(1, (v - (lo - span * 0.5)) / (span * 2)));
};

export const LabResultsFlowsheet: React.FC<{ segments: HL7Segment[] }> = ({ segments }) => {
  const [open, setOpen] = useState(false);
  const obx = segments.filter((s) => s.segment_id === 'OBX' && f(s, 2) !== 'TX' && f(s, 2) !== 'FT');
  if (obx.length === 0) return null;
  const abnormal = obx.filter((s) => f(s, 8) && f(s, 8) !== 'N').length;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 pt-2.5">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 hover:bg-slate-100/70 transition border-b border-slate-200 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 flex-wrap">
            <FlaskConical className="w-3.5 h-3.5 text-sky-600" />
            <span>Lab Results Flowsheet</span>
            <span className="text-[11px] font-normal text-slate-500">
              ({obx.length} {obx.length === 1 ? 'test' : 'tests'}
              {abnormal > 0 ? ` · ${abnormal} abnormal` : ' · all within range'})
            </span>
            {!open && abnormal > 0 && (
              <div className="flex items-center gap-1.5 ml-2">
                {obx
                  .filter((s) => f(s, 8) && f(s, 8) !== 'N')
                  .slice(0, 3)
                  .map((s) => (
                    <span
                      key={s.unique_id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${flagStyle(f(s, 8))}`}
                    >
                      {f(s, 3, 2) || f(s, 3, 1)}: {f(s, 5)} {f(s, 8)}
                    </span>
                  ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>{open ? 'Collapse' : 'Expand'}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>
        {open && (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-white sticky top-0">
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-semibold">Test</th>
                  <th className="text-right px-3 py-2 font-semibold">Result</th>
                  <th className="text-left px-3 py-2 font-semibold">Units</th>
                  <th className="text-left px-3 py-2 font-semibold">Reference</th>
                  <th className="text-left px-3 py-2 font-semibold w-40">Range</th>
                  <th className="text-left px-3 py-2 font-semibold">Flag</th>
                </tr>
              </thead>
              <tbody>
                {obx.map((s) => {
                  const val = f(s, 5), range = f(s, 7), flag = f(s, 8) || 'N';
                  const pos = rangePos(val, range);
                  return (
                    <tr key={s.unique_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-900">{f(s, 3, 2) || f(s, 3, 1)}</div>
                        <div className="text-[10px] font-mono text-slate-500">{f(s, 3, 1)}</div>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${flag !== 'N' ? 'text-rose-700' : 'text-slate-900'}`}>{val || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{f(s, 6, 1) || f(s, 6) || '—'}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{range || '—'}</td>
                      <td className="px-3 py-2">
                        {pos !== null ? (
                          <div className="relative h-2 rounded-full bg-slate-100">
                            <div className="absolute inset-y-0 left-1/4 right-1/4 bg-emerald-100 rounded" />
                            <div className={`absolute -top-0.5 w-3 h-3 rounded-full border-2 border-white shadow ${flag !== 'N' ? 'bg-rose-500' : 'bg-emerald-600'}`} style={{ left: `calc(${pos * 100}% - 6px)` }} />
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${flagStyle(flag)}`}>{flagLabel[flag] || flag}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
