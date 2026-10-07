import React from 'react';
import type { HL7Segment, HL7Field } from '../types/hl7';
import { X, BookOpen, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SegmentDetailModalProps {
  segment: HL7Segment;
  field: HL7Field;
  onClose: () => void;
}

// Knowledge base of target FHIR R4 paths for common HL7 v2 fields
const FHIR_MAPPING_TARGETS: Record<string, { fhirResource: string; path: string; notes: string }> = {
  'MSH-7': { fhirResource: 'Bundle', path: 'Bundle.timestamp', notes: 'Converted from HL7 TS format to ISO-8601 UTC.' },
  'MSH-9': { fhirResource: 'Bundle', path: 'Bundle.type / meta', notes: 'Mapped to message or document bundle structure.' },
  'MSH-10': { fhirResource: 'Bundle', path: 'Bundle.identifier.value', notes: 'Unique bundle message control tracking ID.' },
  'PID-3': { fhirResource: 'Patient', path: 'Patient.identifier', notes: 'Medical Record Number (MRN) with Assigning Authority as system.' },
  'PID-5': { fhirResource: 'Patient', path: 'Patient.name', notes: 'XPN decomposed to Family, Given, Prefix, and Suffix arrays.' },
  'PID-7': { fhirResource: 'Patient', path: 'Patient.birthDate', notes: 'Standard YYYY-MM-DD format.' },
  'PID-8': { fhirResource: 'Patient', path: 'Patient.gender', notes: 'Mapped: M -> male, F -> female, O -> other, U -> unknown.' },
  'PID-10': { fhirResource: 'Patient', path: 'Patient.extension (us-core-race)', notes: 'US Core OMB Race category extension.' },
  'PID-11': { fhirResource: 'Patient', path: 'Patient.address', notes: 'Decomposed to line, city, state, postalCode, country.' },
  'PID-13': { fhirResource: 'Patient', path: 'Patient.telecom', notes: 'System phone/email with use=home or work.' },
  'PID-22': { fhirResource: 'Patient', path: 'Patient.extension (us-core-ethnicity)', notes: 'US Core OMB Ethnicity extension.' },
  'PV1-2': { fhirResource: 'Encounter', path: 'Encounter.class', notes: 'ActEncounterCode (IMP for Inpatient, AMB for Outpatient, EMER for Emergency).' },
  'PV1-3': { fhirResource: 'Encounter', path: 'Encounter.location', notes: 'Assigned location and bed reference.' },
  'PV1-7': { fhirResource: 'Encounter', path: 'Encounter.participant', notes: 'Attending practitioner with type=ATND.' },
  'PV1-44': { fhirResource: 'Encounter', path: 'Encounter.period.start', notes: 'Admission date and time.' },
  'PV1-45': { fhirResource: 'Encounter', path: 'Encounter.period.end', notes: 'Discharge date and time.' },
  'OBR-4': { fhirResource: 'DiagnosticReport', path: 'DiagnosticReport.code', notes: 'Service battery / panel coded with LOINC.' },
  'OBR-7': { fhirResource: 'DiagnosticReport', path: 'DiagnosticReport.effectiveDateTime', notes: 'Specimen collection timestamp.' },
  'OBR-25': { fhirResource: 'DiagnosticReport', path: 'DiagnosticReport.status', notes: 'F -> final, P -> preliminary, C -> amended.' },
  'OBX-2': { fhirResource: 'Observation', path: 'Observation.value[x] type', notes: 'Determines whether valueQuantity, valueString, or valueCodeableConcept is used.' },
  'OBX-3': { fhirResource: 'Observation', path: 'Observation.code', notes: 'Analyte code mapped to standard LOINC or SNOMED CT.' },
  'OBX-5': { fhirResource: 'Observation', path: 'Observation.valueQuantity.value', notes: 'Numeric or string measured result.' },
  'OBX-6': { fhirResource: 'Observation', path: 'Observation.valueQuantity.unit', notes: 'Standardized to UCUM units (e.g. mg/dL, mm[Hg]).' },
  'OBX-7': { fhirResource: 'Observation', path: 'Observation.referenceRange', notes: 'Low and high numeric range interval.' },
  'OBX-8': { fhirResource: 'Observation', path: 'Observation.interpretation', notes: 'Abnormal flags mapped to HL7 v3 ObservationInterpretation (H, L, A).' },
  'OBX-11': { fhirResource: 'Observation', path: 'Observation.status', notes: 'F -> final, P -> preliminary.' },
  'NTE-3': { fhirResource: 'Observation / DiagnosticReport', path: 'resource.note.text', notes: 'Clinical annotations and free-text notes.' },
  'DG1-3': { fhirResource: 'Condition', path: 'Condition.code', notes: 'ICD-10-CM or SNOMED CT diagnosis code.' },
  'AL1-3': { fhirResource: 'AllergyIntolerance', path: 'AllergyIntolerance.code', notes: 'RxNorm or NDF-RT allergen code.' },
  'IN1-4': { fhirResource: 'Coverage', path: 'Coverage.payor', notes: 'Insurance organization reference.' },
};

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({
  segment,
  field,
  onClose,
}) => {
  const fieldKey = `${segment.segment_id}-${field.field_index}`;
  const fhirMapping = FHIR_MAPPING_TARGETS[fieldKey];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              {fieldKey}
            </span>
            <h3 className="font-semibold text-slate-800 text-sm">{field.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* HL7 Specification Details */}
          <div>
            <h4 className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-600" />
              HL7 v2 Standard Definition
            </h4>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
              <p className="text-slate-600">{field.description || 'Standard HL7 data element.'}</p>
              <div className="flex items-center gap-4 text-slate-500 pt-1">
                <span>Data Type: <strong className="text-sky-700 font-mono">{field.type}</strong></span>
                <span>Segment: <strong className="text-slate-700">{segment.title}</strong></span>
              </div>
            </div>
          </div>

          {/* Value Preview */}
          <div>
            <h4 className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-2">
              Ingested Value
            </h4>
            <div className="bg-slate-50 font-mono p-3 rounded-lg border border-slate-200 text-slate-800 break-all select-all">
              {field.raw_value || <span className="text-slate-600 italic">Empty</span>}
            </div>
          </div>

          {/* Component Drill-down if present */}
          {field.repetitions.length > 0 && field.repetitions[0].components.length > 1 && (
            <div>
              <h4 className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-2">
                Sub-Component Breakdown
              </h4>
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {field.repetitions[0].components.map((comp) => (
                  <div key={comp.component_index} className="flex justify-between items-center py-1 px-2 border-b border-slate-850 last:border-b-0">
                    <span className="text-slate-500">
                      {comp.name} <span className="text-[10px] text-slate-600 font-mono">(.{comp.component_index})</span>:
                    </span>
                    <span className="font-mono text-sky-700 font-medium">{comp.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target FHIR R4 Semantic Mapping (Phase 2 Preview) */}
          <div className="pt-2">
            <h4 className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              Target FHIR R4 Mapping (Phase 2 Engine Preview)
            </h4>
            {fhirMapping ? (
              <div className="bg-emerald-50/30 border border-emerald-200/60 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    FHIR Resource: {fhirMapping.fhirResource}
                  </span>
                  <code className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
                    {fhirMapping.path}
                  </code>
                </div>
                <p className="text-slate-600 text-[11px]">{fhirMapping.notes}</p>
              </div>
            ) : segment.is_custom ? (
              <div className="bg-rose-50/30 border border-rose-200/60 rounded-lg p-3 text-rose-700 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Custom Z-Segment Element
                </p>
                <p className="text-slate-600 text-[11px]">
                  Requires LLM semantic translation to infer custom FHIR Extension or appropriate DomainResource.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-500 text-[11px]">
                Standard FHIR mapping defined via deterministic rule or LLM semantic context extraction.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
