import React from 'react';
import type { HL7Segment, HL7Metadata } from '../types/hl7';
import { User, Hospital, CalendarClock, ShieldCheck, ShieldOff, AlertTriangle, BadgeCheck } from 'lucide-react';

interface Props {
  segments: HL7Segment[];
  metadata?: HL7Metadata;
  phiScrubbingEnabled: boolean;
  unresolvedCount: number;
  conformanceScore?: number;
}

const field = (seg: HL7Segment | undefined, idx: number, comp?: number): string => {
  const f = seg?.fields.find((x) => x.field_index === idx);
  if (!f) return '';
  if (comp === undefined) return f.raw_value || '';
  return f.repetitions[0]?.components.find((c) => c.component_index === comp)?.value || '';
};

const fmtDate = (v: string) => {
  if (!v || v.length < 8) return v || 'N/A';
  const d = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  return v.length >= 12 ? `${d} ${v.slice(8, 10)}:${v.slice(10, 12)}` : d;
};

const age = (dob: string) => {
  if (!dob || dob.length < 8) return '';
  const b = new Date(+dob.slice(0, 4), +dob.slice(4, 6) - 1, +dob.slice(6, 8));
  const a = Math.floor((Date.now() - b.getTime()) / 3.15576e10);
  return isNaN(a) ? '' : `${a}y`;
};

const mask = (v: string, on: boolean) => (on && v ? '•••••' : v || 'N/A');

export const ClinicalPatientBanner: React.FC<Props> = ({ segments, metadata, phiScrubbingEnabled, unresolvedCount, conformanceScore }) => {
  const pid = segments.find((s) => s.segment_id === 'PID');
  const pv1 = segments.find((s) => s.segment_id === 'PV1');
  if (!pid) return null;

  const family = field(pid, 5, 1);
  const given = field(pid, 5, 2);
  const name = phiScrubbingEnabled ? 'Patient (PHI protected)' : `${family.toUpperCase()}, ${given}`.replace(/^, |, $/, '') || 'N/A';
  const dob = field(pid, 7);
  const sex = field(pid, 8);
  const mrn = field(pid, 3, 1);
  const cls = field(pv1, 2);
  const loc = [field(pv1, 3, 1), field(pv1, 3, 2), field(pv1, 3, 3)].filter(Boolean).join(' / ');
  const attending = [field(pv1, 7, 2), field(pv1, 7, 3)].filter(Boolean).join(' ');
  const classLabel: Record<string, string> = { I: 'Inpatient', O: 'Outpatient', E: 'Emergency', P: 'Pre-admit' };

  const Item = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-xs text-slate-900 font-medium truncate">{value || 'N/A'}</div>
    </div>
  );

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 border-l-4 border-sky-600">
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">{name}</div>
            <div className="text-[11px] text-slate-600">
              {sex || 'N/A'} · {phiScrubbingEnabled ? 'DOB hidden' : `${fmtDate(dob)} (${age(dob)})`} · MRN {mask(mrn, phiScrubbingEnabled)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Hospital className="w-4 h-4 text-sky-600" />
          <Item label="Encounter" value={`${classLabel[cls] || cls || 'N/A'}${loc ? ' · ' + loc : ''}`} />
        </div>
        <Item label="Attending" value={phiScrubbingEnabled && attending ? '•••••' : attending} />
        <div className="flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-sky-600" />
          <Item label="Message" value={`${metadata?.message_type || 'N/A'} · ${fmtDate(metadata?.message_datetime || '')}`} />
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full border ${phiScrubbingEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            {phiScrubbingEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
            {phiScrubbingEnabled ? 'PHI protected' : 'PHI visible'}
          </span>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full border ${unresolvedCount ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {unresolvedCount ? `${unresolvedCount} to review` : 'Reviewed'}
          </span>
          {conformanceScore !== undefined && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full border bg-sky-50 border-sky-200 text-sky-700">
              <BadgeCheck className="w-3.5 h-3.5" />
              US Core {conformanceScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
