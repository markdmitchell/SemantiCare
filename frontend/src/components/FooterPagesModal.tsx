import React, { useState } from 'react';
import {
  X,
  Info,
  Mail,
  Shield,
  FileText,
  Send,
  CheckCircle2,
  ExternalLink,
  Lock,
  HeartHandshake,
  Sparkles,
  Database,
  AlertCircle
} from 'lucide-react';

export type FooterTab = 'about' | 'contact' | 'privacy' | 'terms';

interface FooterPagesModalProps {
  initialTab?: FooterTab;
  onClose: () => void;
}

export const FooterPagesModal: React.FC<FooterPagesModalProps> = ({
  initialTab = 'about',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FooterTab>(initialTab);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('Integration Question');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !contactMessage.trim()) return;
    // Simulate contact submission
    setContactSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 1500);
  };

  const tabs = [
    { id: 'about', label: 'About SemantiCare', icon: Info },
    { id: 'contact', label: 'Contact & Support', icon: Mail },
    { id: 'privacy', label: 'Privacy & HIPAA', icon: Shield },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header with Navigation Tabs */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white/90 flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as FooterTab);
                    setContactSubmitted(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-600 text-xs leading-relaxed">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <HeartHandshake className="w-5 h-5" />
                  <span>About SemantiCare</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  SemantiCare is an open-architecture clinical informatics and semantic translation platform designed to bridge the chasm between legacy healthcare messaging (HL7 v2.x) and modern FHIR R4 interoperability standards.
                </p>
                <p className="text-slate-500">
                  Billions of critical patient admissions, laboratory observations, vital signs, and diagnostic reports remain locked within heterogeneous HL7 v2 pipes. SemantiCare provides interface engineers and informaticists with deterministic structural AST decomposition, zero-trust tokenized privacy, grounded clinical ontologies (LOINC, UCUM, ICD-10-CM), persistent institutional memory, and sub-second US Core 3.1.1 validation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sky-600 font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>Our Core Principles</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-500 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Deterministic Grounding:</strong> No hallucinated clinical codes or probabilistic medical errors.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Zero-Trust Security:</strong> Local in-memory token vaults guarantee PHI stays within your boundary.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Institutional Learning:</strong> Every informaticist ambiguity resolution builds persistent institutional knowledge.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Open Standards:</strong> Strict adherence to HL7 FHIR R4, US Core 3.1.1, and ONC interoperability rules.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                    <Database className="w-4 h-4" />
                    <span>Open Source & Community</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    SemantiCare is an open source platform developed for hospital health systems, health-tech startups, and interoperability developers.
                  </p>
                  <div className="pt-2">
                    <a
                      href="https://github.com/markdmitchell/semanticare"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>View GitHub Repository</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm">
                  <Mail className="w-5 h-5" />
                  <span>Contact Clinical Support & Interface Engineering</span>
                </div>
                <p className="text-slate-500">
                  Have questions about custom LOINC catalogs, EHR interface integrations (Epic, Cerner, MEDITECH), or bespoke institutional mapping rules? Reach out to our engineering team.
                </p>
              </div>

              {contactSubmitted ? (
                <div className="p-6 bg-emerald-50/30 border border-emerald-200/60 rounded-xl text-center space-y-2 animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-semibold text-slate-900 text-sm">Message Received</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    Thank you for reaching out. A clinical informatics engineer will review your inquiry and follow up shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 max-w-xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Your Name</label>
                      <input
                        type="text"
                        placeholder="Dr. Jordan Hayes"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Work Email</label>
                      <input
                        type="email"
                        placeholder="j.hayes@healthsystem.org"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Inquiry Type</label>
                    <select
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
                    >
                      <option value="Integration Question">EHR Interface / Feed Integration</option>
                      <option value="Custom Ontology">Custom Hospital LOINC / SNOMED Grounding</option>
                      <option value="Mapping Memory">Mapping Memory & ConceptMap Export</option>
                      <option value="Bug Report">Technical Bug Report / Issue</option>
                      <option value="Feature Request">New Feature Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Message Details</label>
                    <textarea
                      rows={4}
                      placeholder="Describe your HL7 v2 feed, message volumes, or technical question..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 focus:outline-none focus:border-sky-500 resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: PRIVACY & HIPAA */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <Lock className="w-5 h-5" />
                  <span>Zero-Trust Privacy & HIPAA Safe Harbor Compliance</span>
                </div>
                <p className="text-slate-600">
                  At SemantiCare, patient data privacy is not an afterthought or an optional configuration—it is enforced mathematically through our local Zero-Trust Reversible Token Vault architecture.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">1. De-Identification Methodology</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    SemantiCare aligns with the <strong>HIPAA Privacy Rule Safe Harbor Method (45 CFR § 164.514(b)(2))</strong>. All 18 direct and indirect identifiers—including patient names, medical record numbers (MRNs), social security numbers, dates of birth, street addresses, postal codes, and telephone numbers—are stripped and replaced with deterministic cryptographic surrogate tokens (e.g. <code>[PATIENT_FAMILY_NAME_1]</code>, <code>[MRN_1]</code>).
                  </p>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">2. In-Memory Ephemeral Vault & No PHI Transmission</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    The token substitution mapping table exists strictly in volatile process memory for the lifetime of your active browser session. <strong>No raw PHI is ever logged to disk, transmitted to cloud LLM providers, or exposed over external network connections.</strong>
                  </p>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">3. Institutional Mapping Memory Isolation</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    The SQLite Mapping Memory database (<code>mapping_rules.db</code>) stores only abstract semantic associations (e.g. <code>METRO_HEALTH: BP_LOCAL -&gt; 85354-9</code> or <code>29463-7 -&gt; kg</code>). It contains zero patient names, identifiers, dates, or clinical notes.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">4. Dual-Flavor Export Controls</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    You have complete administrative control over output files:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px]">
                    <li><strong>De-Identified Export:</strong> Safe for machine learning benchmarks, cross-institutional research, and public analytics.</li>
                    <li><strong>Re-Hydrated Export:</strong> Restores legitimate patient demographics strictly within your authenticated internal hospital perimeter.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm">
                  <FileText className="w-5 h-5" />
                  <span>Terms of Service & Clinical Software Disclaimers</span>
                </div>
                <p className="text-slate-500">
                  Last updated: October 2026. Please review these operational terms prior to utilizing SemantiCare in production clinical environments.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">1. Permitted Use & Scope</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    SemantiCare is provided for healthcare software developers, clinical informatics specialists, interface analysts, and research institutions to ingest, inspect, normalize, ground, and transform HL7 v2 messages into FHIR R4 standard structures.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>2. Clinical Decision Support & Medical Device Disclaimer</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    SemantiCare is a syntactic and semantic data transformation engine. <strong>It does not provide medical diagnoses, treatment recommendations, or clinical decision support.</strong> All clinical inferences and mappings must be reviewed and validated by credentialed clinical informaticists or physicians prior to utilization in direct patient care decisions.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">3. Open Standards & Intellectual Property</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    HL7 and FHIR are registered trademarks of Health Level Seven International. LOINC is copyright Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee. SNOMED CT is copyright International Health Terminology Standards Development Organisation. SemantiCare code is distributed under permissive open-source licensing.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-900">4. Warranty & Limitation of Liability</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    SemantiCare is provided "as is", without warranty of any kind, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use or inability to use the software.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white/80 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">SemantiCare • Open Clinical Interoperability</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
