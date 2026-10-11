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
import { fetchSamples, parseHL7, mapHL7, validateFHIRBundle, fetchHealth, fetchMappingRules, getActiveEngineMode } from './services/api';
import { Navbar } from './components/Navbar';
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
import { EngineStatusModal } from './components/EngineStatusModal';
import { BatchProcessorModal } from './components/BatchProcessorModal';
import { GuidedTour } from './components/GuidedTour';
import { generateSyntheticMessage, type SyntheticPreset } from './engine/syntheticGenerator';
import { FooterPagesModal, type FooterTab } from './components/FooterPagesModal';
import { Footer } from './components/Footer';
import { LabResultsFlowsheet } from './components/LabResultsFlowsheet';
import { ClinicalPatientBanner } from './components/ClinicalPatientBanner';
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

  // Modals & Guided Tour
  const [inspectingField, setInspectingField] = useState<{ segment: HL7Segment; field: HL7Field } | null>(null);
  const [showPHIAudit, setShowPHIAudit] = useState<boolean>(false);
  const [selectedAmbiguity, setSelectedAmbiguity] = useState<AmbiguityFlag | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showUserGuide, setShowUserGuide] = useState<boolean>(false);
  const [showEngineModal, setShowEngineModal] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
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
        const health = await fetchHealth();
        setBackendOnline(health.engine_mode === 'backend');
      } catch (err) {
        console.warn('Backend check failed:', err);
        setBackendOnline(false);
      }

      refreshRulesCount();

      try {
        const sampleList = await fetchSamples();
        setSamples(sampleList);
        // Start from a clean, blank scenario on initial load
      } catch (err) {
        console.error('Failed to load clinical samples:', err);
        setErrorMessage('Failed to initialize clinical samples.');
      }
    }

    init();
  }, []);

  const executePipeline = async (hl7Content: string, phiScrubbing?: boolean) => {
    setLoading(true);
    setMappingLoading(true);
    setErrorMessage(null);
    const scrub = phiScrubbing !== undefined ? phiScrubbing : phiScrubbingEnabled;

    try {
      const [parseRes, mapRes] = await Promise.all([
        parseHL7(hl7Content),
        mapHL7(hl7Content, scrub),
      ]);
      setParseResult(parseRes);
      setMappingResult(mapRes);
      setBackendOnline(getActiveEngineMode() === 'backend');

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
      setErrorMessage(err.message || 'Error occurred while processing message.');
      setBackendOnline(getActiveEngineMode() === 'backend');
    } finally {
      setLoading(false);
      setMappingLoading(false);
    }
  };

  const handleTogglePhiScrubbing = (enabled: boolean) => {
    setPhiScrubbingEnabled(enabled);
    executePipeline(rawHL7, enabled);
  };

  const handleStartTour = () => {
    handleClearToBlank(true);
    setShowTour(true);
  };

  const handleLoadSyntheticCase = (preset: SyntheticPreset) => {
    const synthCase = generateSyntheticMessage(preset);
    setActiveSample(synthCase);
    setRawHL7(synthCase.raw);
    setErrorMessage(null);
    executePipeline(synthCase.raw, phiScrubbingEnabled);
  };

  const handleGenerateRandomCase = () => {
    const presets: SyntheticPreset[] = ['cardiology', 'critical_lab', 'hitl_showcase'];
    const chosen = presets[Math.floor(Math.random() * presets.length)];
    handleLoadSyntheticCase(chosen);
  };

  const handleClearToBlank = (keepTour = false) => {
    setActiveSample(null);
    setRawHL7('');
    setParseResult(null);
    setMappingResult(null);
    setValidationResult(null);
    setErrorMessage(null);
    if (!keepTour) {
      setShowTour(false);
    }
    setActiveMode('structural');
  };

  const handleLoadDefaultSample = () => {
    if (samples.length > 0) {
      handleSelectSample(samples[0]);
    }
  };

  const handleResetToDefault = () => {
    handleClearToBlank(true);
  };

  const handleResetResolutions = () => {
    if (rawHL7.trim()) {
      executePipeline(rawHL7, phiScrubbingEnabled);
    }
  };

  const handleResolveAmbiguitiesDemo = () => {
    if (!mappingResult?.ambiguities) return;
    const updated = JSON.parse(JSON.stringify(mappingResult)) as MapHL7Response;
    let anyChanged = false;

    const updateResourceInBundle = (bundle: any, amb: AmbiguityFlag, resolvedValue: string) => {
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

    for (const amb of updated.ambiguities) {
      if (!amb.is_resolved) {
        const choice = amb.default_choice || (amb.suggested_options && amb.suggested_options[0]) || 'Verified Value';
        amb.is_resolved = true;
        amb.resolved_value = choice;
        amb.resolved_by = 'Guided Informaticist Tour';
        updateResourceInBundle(updated.fhir_bundle, amb, choice);
        updateResourceInBundle(updated.rehydrated_bundle, amb, choice);

        if (updated.resource_confidences && updated.resource_confidences[amb.target_resource_id]) {
          updated.resource_confidences[amb.target_resource_id].level = 'high';
          updated.resource_confidences[amb.target_resource_id].score = 100;
          updated.resource_confidences[amb.target_resource_id].reason = `Clinician Verified: ${choice}`;
        }
        anyChanged = true;
      }
    }

    if (!anyChanged) return;

    const totalAmbiguities = updated.ambiguities.length;
    const resolvedCount = updated.ambiguities.filter((a) => a.is_resolved).length;
    if (totalAmbiguities > 0) {
      const baseScore = 90;
      const boost = Math.round((resolvedCount / totalAmbiguities) * 10);
      updated.confidence_score = Math.min(100, baseScore + boost);
    }

    setMappingResult(updated);

    if (updated.fhir_bundle) {
      validateFHIRBundle(updated.fhir_bundle, selectedProfile).then((vr) => {
        setValidationResult(vr);
      });
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
  const hasWorkspaceContent = !!rawHL7.trim() || !!activeSample || !!parseResult || !!mappingResult;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Top Navigation */}
      <Navbar
        backendOnline={backendOnline}
        totalSegments={parseResult?.metadata?.total_segments || 0}
        messageType={parseResult?.metadata?.message_type}
        activeMode={activeMode}
        unresolvedAmbiguitiesCount={unresolvedAmbiguities.length}
        conformanceScore={validationResult?.conformance_score}
        canExport={!!mappingResult?.fhir_bundle}
        hasContent={hasWorkspaceContent}
        rulesCount={rulesCount}
        samples={samples}
        selectedSampleId={activeSample?.id || ''}
        onSelectSample={handleSelectSample}
        onToggleMode={(mode) => setActiveMode(mode)}
        onOpenHowItWorks={() => setShowHowItWorks(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenRulesModal={() => setShowRulesModal(true)}
        onOpenUserGuide={() => setShowUserGuide(true)}
        onOpenEngineModal={() => setShowEngineModal(true)}
        onOpenBatchModal={() => setShowBatchModal(true)}
        onStartTour={handleStartTour}
        onGenerateSynthetic={handleGenerateRandomCase}
        onResetToDefault={handleResetToDefault}
        onClearToBlank={() => handleClearToBlank(false)}
      />

      <ClinicalPatientBanner
        segments={parseResult?.segments || []}
        metadata={parseResult?.metadata}
        phiScrubbingEnabled={phiScrubbingEnabled}
        unresolvedCount={unresolvedAmbiguities.length}
        conformanceScore={validationResult?.conformance_score}
      />

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

      <LabResultsFlowsheet segments={parseResult?.segments || []} />

      {/* Main Split-Pane Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-3 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Pane: Ingestion & Controls (5 cols on lg) */}
        <section className="lg:col-span-5 h-[calc(100vh-270px)] min-h-[540px]">
          <HL7InputPanel
            rawHL7={rawHL7}
            setRawHL7={(val) => {
              setRawHL7(val);
              setActiveSample(null);
            }}
            onParse={handleParseOnly}
            onMapToFHIR={handleMapOnly}
            onClearToBlank={() => handleClearToBlank(false)}
            loading={loading}
            mappingLoading={mappingLoading}
            phiScrubbingEnabled={phiScrubbingEnabled}
            setPhiScrubbingEnabled={handleTogglePhiScrubbing}
            delimiters={parseResult?.metadata?.delimiters}
            activeSample={activeSample}
            onStartTour={handleStartTour}
            onLoadDefaultSample={handleLoadDefaultSample}
          />
        </section>

        {/* Right Pane: 4 Perspectives (AST / Resolution / FHIR Studio / Validation) */}
        <section className="lg:col-span-7 h-[calc(100vh-270px)] min-h-[540px]">
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

      {showEngineModal && (
        <EngineStatusModal
          isOpen={showEngineModal}
          onClose={() => setShowEngineModal(false)}
          onEngineChanged={() => {
            setBackendOnline(getActiveEngineMode() === 'backend');
            executePipeline(rawHL7);
          }}
        />
      )}

      {showBatchModal && (
        <BatchProcessorModal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          onLoadSingleMessage={(msg) => {
            setRawHL7(msg);
            executePipeline(msg);
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

      {/* Interactive Guided Demo and Clinical Walkthrough */}
      <GuidedTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        activeMode={activeMode}
        onSelectMode={(mode) => setActiveMode(mode)}
        phiScrubbingEnabled={phiScrubbingEnabled}
        onTogglePhiScrubbing={handleTogglePhiScrubbing}
        onLoadSyntheticCase={handleLoadSyntheticCase}
        onResolveAmbiguitiesDemo={handleResolveAmbiguitiesDemo}
        onResetResolutions={handleResetResolutions}
        onOpenExportModal={() => setShowExportModal(true)}
        onResetToDefault={handleResetToDefault}
        conformanceScore={validationResult?.conformance_score}
        unresolvedAmbiguitiesCount={unresolvedAmbiguities.length}
        isMessageLoaded={!!rawHL7.trim()}
      />
    </div>
  );
};

export default App;
