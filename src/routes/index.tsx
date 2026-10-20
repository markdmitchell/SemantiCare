import { createFileRoute } from '@tanstack/react-router';
import Workbench from '../../frontend/src/Workbench';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'SemantiCare | HL7 v2 to FHIR R4 Workbench' },
    { name: 'description', content: 'Process HL7 v2 messages privately in your browser, review FHIR R4 validation, and request AI-powered explanations of failures.' },
    { property: 'og:title', content: 'SemantiCare | Clinical Mapping Workbench' },
    { property: 'og:description', content: 'Browser-based HL7 to FHIR mapping with human review and actionable validation explanations.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ], links: [{ rel: 'canonical', href: 'https://semanticare.health/' }] }),
  component: Workbench,
});