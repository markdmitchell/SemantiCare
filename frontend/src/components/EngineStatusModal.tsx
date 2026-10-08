import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Globe,
  RefreshCw,
  CheckCircle2,
  Zap,
  Cpu,
  Sliders,
} from 'lucide-react';
import {
  getEngineTelemetry,
  setEnginePreference,
  fetchHealth,
  type EnginePreference,
  type EngineTelemetry,
} from '../services/api';

interface EngineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEngineChanged: () => void;
}

export const EngineStatusModal: React.FC<EngineStatusModalProps> = ({
  isOpen,
  onClose,
  onEngineChanged,
}) => {
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(getEngineTelemetry());
  const [pinging, setPinging] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refreshTelemetry = () => {
    setTelemetry(getEngineTelemetry());
  };

  useEffect(() => {
    if (!isOpen) {
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePreferenceChange = (pref: EnginePreference) => {
    setEnginePreference(pref);
    refreshTelemetry();
    onEngineChanged();
  };

  const handlePing = async () => {
    setPinging(true);
    setTestResult(null);
    try {
      const health = await fetchHealth();
      refreshTelemetry();
      onEngineChanged();
      if (health.engine_mode === 'backend') {
        setTestResult('FastAPI backend responded successfully!');
      } else {
        setTestResult('FastAPI backend unreachable. In-browser fallback engine is active.');
      }
    } catch {
      setTestResult('Health ping check failed.');
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Processing Engine Telemetry</h3>
              <p className="text-xs text-slate-500">SemantiCare Intelligent Hybrid Architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active Status Card */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-start gap-3.5">
            <div
              className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${
                telemetry.activeMode === 'backend'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {telemetry.activeMode === 'backend' ? (
                <Server className="w-5 h-5" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {telemetry.serviceName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    telemetry.activeMode === 'backend'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-sky-50 border-sky-200 text-sky-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      telemetry.activeMode === 'backend' ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                  />
                  {telemetry.activeMode === 'backend' ? 'Live Python 3.14' : 'Client Standalone'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {telemetry.activeMode === 'backend'
                  ? 'High-speed Python runtime with SQLite mapping memory & deep FHIR conformance.'
                  : 'Zero-install TypeScript WebAssembly engine running entirely within your browser.'}
              </p>
              <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center gap-3">
                <span>Endpoint: {telemetry.apiBase}</span>
                {telemetry.pingMs >= 0 && (
                  <span className="flex items-center gap-0.5 text-slate-600">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {telemetry.pingMs}ms
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Engine Mode Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Engine Selection Preference
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePreferenceChange('auto')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  telemetry.preference === 'auto'
                    ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900">Auto (Default)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Use FastAPI when live; fallback to browser</div>
              </button>

              <button
                type="button"
                onClick={() => handlePreferenceChange('backend')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  telemetry.preference === 'backend'
                    ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                  <Server className="w-3 h-3 text-slate-600" />
                  FastAPI Server
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Force Python backend execution</div>
              </button>

              <button
                type="button"
                onClick={() => handlePreferenceChange('browser')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  telemetry.preference === 'browser'
                    ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-600" />
                  In-Browser
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Force local offline client engine</div>
              </button>
            </div>
          </div>

          {/* Test & Reconnect */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handlePing}
              disabled={pinging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
              {pinging ? 'Pinging Backend...' : 'Ping / Test Health'}
            </button>
            {testResult && (
              <span className="text-xs text-slate-600 font-medium">
                {testResult}
              </span>
            )}
          </div>

          {/* Capabilities List */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Active Pipeline Features ({telemetry.features.length})
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {telemetry.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
