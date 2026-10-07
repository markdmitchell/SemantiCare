import React, { useState, useEffect } from 'react';
import type {
  HL7Sample,
  ParseHL7Response,
  MapHL7Response,
  ValidationResult,
  HL7Segment,
  HL7Field,
  AmbiguityFlag,
} from './types/hl7';
import { fetchSamples, parseHL7, mapHL7, validateFHIRBundle, fetchHealth, fetchMappingRules } from './services/api';
import { Navbar } from './components/Navbar';
import { SamplePickerBar } from './components/SamplePickerBar';
import { HL7InputPanel } from './components/HL7InputPanel';
import { StructuralTreeViewer } from './components/StructuralTreeViewer';
import { FHIRBundleViewer } from './components/FHIRBundleViewer';
import { ResolutionDeck } from './components/ResolutionDeck';
import { ValidationInspector } from './components/ValidationInspector';
import { SegmentDetailModal } from './components/SegmentDetailModal';
import { PHIAuditModal } from './components/PHIAuditModal';
import { AmbiguityDetailModal } from './components/AmbiguityDetailModal';
import { ExportModal } from './components/ExportModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { InstitutionalRulesModal } from './components/InstitutionalRulesModal';
import { UserGuideModal } from './components/UserGuideModal';
import { FooterPagesModal, type FooterTab } from './components/FooterPagesModal';
import { Footer } from './components/Footer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [samples, setSamples] = useState<HL7Sample[]>([]);
  const [activeSample, setActiveSample] = useState<HL7Sample | null>(null);
  const [rawHL7, setRawHL7] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseHL7Response | null>(null);
  const [mappingResult, setMappingResult] = useState<MapHL7Response | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [mappingLoading, setMappingLoading] = useState<boolean>(false);
  const [validationLoading, setValidationLoading] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'structural' | 'semantic' | 'resolution' | 'validation'>('semantic');
  const [phiScrubbingEnabled, setPhiScrubbingEnabled] = useState<boolean>(true);
  const [selectedProfile, setSelectedProfile] = useState<string>('us-core');

  // Modals
  const [inspectingField, setInspectingField] = useState<{ segment: HL7Segment; field: HL7Field } | null>(null);
  const [showPHIAudit, setShowPHIAudit] = useState<boolean>(false);
  const [selectedAmbiguity, setSelectedAmbiguity] = useState<AmbiguityFlag | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showUserGuide, setShowUserGuide] = useState<boolean>(false);
  const [footerModalTab, setFooterModalTab] = useState<FooterTab | null>(null);
  const [rulesCount, setRulesCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshRulesCount = async () => {
    try {
      const res = await fetchMappingRules();
      setRulesCount(res.count || 0);
    } catch (err) {
      console.warn('Could not fetch rules count:', err);
    }
  };

  // Initialize and load default sample
  useEffect(() => {
    async function init() {
      try {
        await fetchHealth();
        setBackendOnline(true);
      } catch (err) {
        console.warn('Backend not responding yet:', err);
        setBackendOnline(false);
      }

      refreshRulesCount();

      try {
        const sampleList = await fetchSamples();
        setSamples(sampleList);
        if (sampleList.length > 0) {
          const defaultSample = sampleList[0];
          setActiveSample(defaultSample);
          setRawHL7(defaultSample.raw);
          // Initial mapping, parsing, and validation
          executePipeline(defaultSample.raw);
        }
      } catch (err) {
        console.error('Failed to load clinical samples:', err);
        setErrorMessage('Could not connect to FastAPI backend. Ensure backend is running on http://127.0.0.1:8000.');
      }
    }

    init();
  }, []);

  const executePipeline = async (hl7Content: string) => {
    setLoading(true);
    setMappingLoading(true);
    setErrorMessage(null);

    try {
      const [parseRes, mapRes] = await Promise.all([
        parseHL7(hl7Content),
        mapHL7(hl7Content, phiScrubbingEnabled),
      ]);
      setParseResult(parseRes);
      setMappingResult(mapRes);
      setBackendOnline(true);

      // Validate the newly mapped bundle
      if (mapRes.success && mapRes.fhir_bundle) {
        setValidationLoading(true);
        try {
          const valRes = await validateFHIRBundle(mapRes.fhir_bundle, selectedProfile);
          setValidationResult(valRes);
        } catch (valErr) {
          console.warn('Auto-validation warning:', valErr);
        } finally {
          setValidationLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      setErrorMessage(err.message || 'Error occurred while communicating with the backend API.');
      setBackendOnline(false);
    } finally {
      setLoading(false);
      setMappingLoading(false);
    }
  };

  const handleSelectSample = (sample: HL7Sample) => {
    setActiveSample(sample);
    setRawHL7(sample.raw);
    setErrorMessage(null);
    executePipeline(sample.raw);
  };

  const handleParseOnly = async () => {
    if (!rawHL7.trim()) {
      setErrorMessage('Please enter an HL7 v2 message.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await parseHL7(rawHL7);
      setParseResult(res);
      setActiveMode('structural');
    } catch (err: any) {
      setErrorMessage(err.message || 'Parse error.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapOnly = async () => {
    if (!rawHL7.trim()) {
      setErrorMessage('Please enter an HL7 v2 message.');
      return;
    }
    setMappingLoading(true);
    setErrorMessage(null);
    try {
      const [parseRes, mapRes] = await Promise.all([
        parseHL7(rawHL7),
        mapHL7(rawHL7, phiScrubbingEnabled),
      ]);
      setParseResult(parseRes);
      setMappingResult(mapRes);
      setActiveMode('semantic');

      if (mapRes.success && mapRes.fhir_bundle) {
        const valRes = await validateFHIRBundle(mapRes.fhir_bundle, selectedProfile);
        setValidationResult(valRes);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Mapping error.');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleRevalidate = async (profileToUse?: string) => {
    const prof = profileToUse || selectedProfile;
    if (!mappingResult?.fhir_bundle) return;
    setValidationLoading(true);
    try {
      const valRes = await validateFHIRBundle(mappingResult.fhir_bundle, prof);
      setValidationResult(valRes);
    } catch (err: any) {
      console.error('Revalidation error:', err);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    handleRevalidate(profile);
  };

  // Phase 3 & 4: In-Memory Clinical Ambiguity Resolution & Auto-Validation
  const handleResolveAmbiguity = (ambiguityId: string, resolvedValue: string) => {
    if (!mappingResult) return;

    const updated = JSON.parse(JSON.stringify(mappingResult)) as MapHL7Response;
    const amb = updated.ambiguities.find((a) => a.id === ambiguityId);
    if (!amb) return;

    if (!resolvedValue) {
      amb.is_resolved = false;
      amb.resolved_value = undefined;
    } else {
      amb.is_resolved = true;
      amb.resolved_value = resolvedValue;

      const updateResourceInBundle = (bundle: any) => {
        if (!bundle?.entry) return;
        for (const entry of bundle.entry) {
          const res = entry.resource;
          if (res && res.id === amb.target_resource_id) {
            if (amb.type === 'MISSING_UNIT' && res.valueQuantity) {
              res.valueQuantity.unit = resolvedValue;
              res.valueQuantity.code = resolvedValue;
              res.valueQuantity.system = 'http://unitsofmeasure.org';
            } else if (amb.type === 'LOCAL_TERMINOLOGY') {
              const codeMatch = resolvedValue.split(' - ')[0]?.trim();
              const displayMatch = resolvedValue.split(' - ')[1]?.trim();
              if (res.code?.coding?.[0]) {
                res.code.coding[0].code = codeMatch || res.code.coding[0].code;
                res.code.coding[0].display = displayMatch || res.code.coding[0].display;
                res.code.text = displayMatch || res.code.text;
              }
            }
          }
        }
      };

      updateResourceInBundle(updated.fhir_bundle);
      updateResourceInBundle(updated.rehydrated_bundle);

      if (updated.resource_confidences && updated.resource_confidences[amb.target_resource_id]) {
        updated.resource_confidences[amb.target_resource_id].level = 'high';
        updated.resource_confidences[amb.target_resource_id].score = 100;
        updated.resource_confidences[amb.target_resource_id].reason = `Clinician Verified: ${resolvedValue}`;
      }
    }

    const totalAmbiguities = updated.ambiguities.length;
    const resolvedCount = updated.ambiguities.filter((a) => a.is_resolved).length;
    if (totalAmbiguities > 0) {
      const baseScore = 90;
      const boost = Math.round((resolvedCount / totalAmbiguities) * 10);
      updated.confidence_score = Math.min(100, baseScore + boost);
    }

    setMappingResult(updated);

    // Auto re-validate after resolution
    if (updated.fhir_bundle) {
      validateFHIRBundle(updated.fhir_bundle, selectedProfile).then((vr) => {
        setValidationResult(vr);
      });
    }
  };

  const handleDirectJsonEdit = (newBundle: any) => {
    if (!mappingResult) return;
    setMappingResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fhir_bundle: newBundle,
        rehydrated_bundle: newBundle,
      };
    });

    // Re-validate edited bundle
    validateFHIRBundle(newBundle, selectedProfile)
      .then((vr) => setValidationResult(vr))
      .catch((e) => console.warn('Edit validation check:', e));
  };

  const unresolvedAmbiguities = mappingResult?.ambiguities.filter((a) => !a.is_resolved) || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-800">
      {/* Top Navigation */}
      <Navbar
        backendOnline={backendOnline}
        totalSegments={parseResult?.metadata?.total_segments || 0}
        messageType={parseResult?.metadata?.message_type}
        activeMode={activeMode}
        unresolvedAmbiguitiesCount={unresolvedAmbiguities.length}
        conformanceScore={validationResult?.conformance_score}
        canExport={!!mappingResult?.fhir_bundle}
        rulesCount={rulesCount}
        onToggleMode={(mode) => setActiveMode(mode)}
        onOpenHowItWorks={() => setShowHowItWorks(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenRulesModal={() => setShowRulesModal(true)}
        onOpenUserGuide={() => setShowUserGuide(true)}
      />

      {/* Clinical Scenario Selector Bar */}
      {samples.length > 0 && (
        <SamplePickerBar
          samples={samples}
          selectedSampleId={activeSample?.id || ''}
          onSelectSample={handleSelectSample}
        />
      )}

      {/* Error Alert Banner if any */}
      {errorMessage && (
        <div className="bg-rose-50/90 border-b border-rose-200 text-rose-700 px-5 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => executePipeline(rawHL7)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-slate-900 text-[11px] font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Main Split-Pane Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left Pane: Ingestion & Controls (5 cols on lg) */}
        <section className="lg:col-span-5 h-[calc(100vh-175px)] min-h-[500px]">
          <HL7InputPanel
            rawHL7={rawHL7}
            setRawHL7={(val) => {
              setRawHL7(val);
              setActiveSample(null);
            }}
            onParse={handleParseOnly}
            onMapToFHIR={handleMapOnly}
            loading={loading}
            mappingLoading={mappingLoading}
            phiScrubbingEnabled={phiScrubbingEnabled}
            setPhiScrubbingEnabled={setPhiScrubbingEnabled}
            delimiters={parseResult?.metadata?.delimiters}
            activeSample={activeSample}
          />
        </section>

        {/* Right Pane: 4 Perspectives (AST / Resolution / FHIR Studio / Validation) */}
        <section className="lg:col-span-7 h-[calc(100vh-175px)] min-h-[500px]">
          {activeMode === 'structural' ? (
            <StructuralTreeViewer
              segments={parseResult?.segments || []}
              metadata={parseResult?.metadata}
              onSelectField={(segment, field) => setInspectingField({ segment, field })}
            />
          ) : activeMode === 'resolution' ? (
            <ResolutionDeck
              ambiguities={mappingResult?.ambiguities || []}
              onResolve={handleResolveAmbiguity}
              onResetResolutions={() => executePipeline(rawHL7)}
              facility={parseResult?.metadata?.sending_facility || parseResult?.metadata?.receiving_facility || ''}
              onRuleLearned={() => {
                refreshRulesCount();
              }}
            />
          ) : activeMode === 'validation' ? (
            <ValidationInspector
              validationResult={validationResult}
              loading={validationLoading}
              selectedProfile={selectedProfile}
              onProfileChange={handleProfileChange}
              onRevalidate={() => handleRevalidate()}
            />
          ) : mappingResult ? (
            <FHIRBundleViewer
              mappingResult={mappingResult}
              onOpenPHIAudit={() => setShowPHIAudit(true)}
              onSelectAmbiguity={(amb) => setSelectedAmbiguity(amb)}
              onOpenResolutionDeck={() => setActiveMode('resolution')}
              onDirectJsonEdit={handleDirectJsonEdit}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
              Click "Map to FHIR R4" to initiate semantic mapping.
            </div>
          )}
        </section>
      </main>

      {/* Footer with About, Contact, Privacy, Terms, User Guide, and GitHub */}
      <Footer
        onOpenFooterModal={(tab) => setFooterModalTab(tab)}
        onOpenUserGuide={() => setShowUserGuide(true)}
        onOpenRoadmap={() => setShowHowItWorks(true)}
      />

      {/* Modals */}
      {inspectingField && (
        <SegmentDetailModal
          segment={inspectingField.segment}
          field={inspectingField.field}
          onClose={() => setInspectingField(null)}
        />
      )}

      {showPHIAudit && mappingResult && (
        <PHIAuditModal
          audit={mappingResult.phi_audit}
          onClose={() => setShowPHIAudit(false)}
        />
      )}

      {selectedAmbiguity && (
        <AmbiguityDetailModal
          ambiguity={selectedAmbiguity}
          onClose={() => setSelectedAmbiguity(null)}
          onResolve={handleResolveAmbiguity}
        />
      )}

      {showExportModal && mappingResult && (
        <ExportModal
          mappingResult={mappingResult}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
      )}

      {showRulesModal && (
        <InstitutionalRulesModal
          onClose={() => setShowRulesModal(false)}
          onRulesUpdated={() => {
            refreshRulesCount();
            executePipeline(rawHL7);
          }}
        />
      )}

      {showUserGuide && (
        <UserGuideModal onClose={() => setShowUserGuide(false)} />
      )}

      {footerModalTab && (
        <FooterPagesModal
          initialTab={footerModalTab}
          onClose={() => setFooterModalTab(null)}
        />
      )}
    </div>
  );
};

export default App;
