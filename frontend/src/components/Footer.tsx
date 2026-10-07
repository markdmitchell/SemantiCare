import React from 'react';
import {
  Activity,
  BookOpen,
  Shield,
  FileText,
  Mail,
  Info,
  ExternalLink,
  Cpu,
  Lock,
} from 'lucide-react';
import type { FooterTab } from './FooterPagesModal';

interface FooterProps {
  onOpenFooterModal: (tab: FooterTab) => void;
  onOpenUserGuide: () => void;
  onOpenRoadmap: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenFooterModal,
  onOpenUserGuide,
  onOpenRoadmap,
}) => {
  return (
    <footer className="border-t border-slate-200/80 bg-slate-50 text-slate-500 text-xs py-8 px-6 mt-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          {/* Brand & Mission */}
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-sky-600 via-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-tight">SemantiCare</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                v1.1 Active
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              AI-assisted semantic data mapper transforming legacy HL7 v2 clinical feeds into validated FHIR R4 resources with zero-trust tokenized privacy and persistent institutional memory.
            </p>
          </div>

          {/* Links Grid */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <button
              onClick={() => onOpenFooterModal('about')}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-sky-600" />
              <span>About</span>
            </button>

            <button
              onClick={() => onOpenFooterModal('contact')}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contact</span>
            </button>

            <button
              onClick={() => onOpenFooterModal('privacy')}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Privacy & HIPAA</span>
            </button>

            <button
              onClick={() => onOpenFooterModal('terms')}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Terms of Service</span>
            </button>

            <button
              onClick={onOpenUserGuide}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer font-medium text-sky-700"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>User Guide</span>
            </button>

            <button
              onClick={onOpenRoadmap}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>Roadmap</span>
            </button>

            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              <span>API Swagger</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            <a
              href="https://github.com/markdmitchell/semanticare"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current text-slate-600" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Bottom Disclaimer & Regulatory Notes */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>© 2026 SemantiCare. Open Healthcare Interoperability.</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              Zero-Trust Local Token Vault (HIPAA Safe Harbor)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-500">US Core 3.1.1 Conformance</span>
            <span>•</span>
            <span className="font-mono text-slate-500">SQLite ACID Memory</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
