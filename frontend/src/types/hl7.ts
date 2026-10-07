export interface HL7Delimiters {
  field: string;
  component: string;
  repetition: string;
  escape: string;
  subcomponent: string;
}

export interface HL7Component {
  component_index: number;
  name: string;
  value: string;
  subcomponents: string[];
}

export interface HL7Repetition {
  repetition_index: number;
  raw: string;
  components: HL7Component[];
}

export interface HL7Field {
  field_index: number;
  name: string;
  type: string;
  description: string;
  raw_value: string;
  repetitions: HL7Repetition[];
}

export interface HL7Segment {
  segment_id: string;
  unique_id: string;
  order_index: number;
  title: string;
  description: string;
  is_custom: boolean;
  raw: string;
  fields: HL7Field[];
}

export interface HL7Metadata {
  delimiters: HL7Delimiters;
  total_segments: number;
  segment_counts: Record<string, number>;
  warnings: string[];
  sending_application?: string;
  sending_facility?: string;
  receiving_application?: string;
  receiving_facility?: string;
  message_datetime?: string;
  message_type?: string;
  message_control_id?: string;
  processing_id?: string;
  hl7_version?: string;
}

export interface ParseHL7Response {
  success: boolean;
  is_valid: boolean;
  metadata: HL7Metadata;
  segments: HL7Segment[];
  error?: string;
}

export interface HL7Sample {
  id: string;
  title: string;
  category: string;
  description: string;
  highlights: string[];
  raw: string;
}

export interface PHIEntityAudit {
  entity_type: string;
  token: string;
  location: string;
  preview: string;
}

export interface PHIAudit {
  total_redactions: number;
  entity_breakdown: Record<string, number>;
  entities: PHIEntityAudit[];
}

export interface AmbiguityFlag {
  id: string;
  type: 'MISSING_UNIT' | 'LOCAL_TERMINOLOGY' | 'CUSTOM_Z_SEGMENT' | 'COMPOUND_VALUE' | string;
  severity: 'action_required' | 'warning' | 'info';
  field_location: string;
  title: string;
  message: string;
  suggested_options?: string[];
  default_choice?: string;
  target_resource_id: string;
  target_property_path?: string;
  source_key?: string;
  is_resolved?: boolean;
  resolved_value?: string;
  resolved_by?: string;
}

export interface ResourceConfidence {
  resource_id: string;
  resource_type: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  reason: string;
  ambiguity_ids: string[];
}

export interface MappingLineage {
  fhir_path: string;
  hl7_source: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface MapHL7Response {
  success: boolean;
  fhir_bundle: any;
  rehydrated_bundle: any;
  phi_audit: PHIAudit;
  confidence_score: number;
  confidence_counts: Record<string, number>;
  resource_confidences?: Record<string, ResourceConfidence>;
  ambiguities: AmbiguityFlag[];
  lineage: MappingLineage[];
  total_resources: number;
  resource_types: string[];
  error?: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'information';
  resource_id: string;
  resource_type: string;
  location: string;
  rule: string;
  message: string;
}

export interface ResourceValidationResult {
  resource_id: string;
  resource_type: string;
  is_valid: boolean;
  error_count: number;
  warning_count: number;
  issues: ValidationIssue[];
}

export interface ValidationResult {
  is_valid: boolean;
  conformance_score: number;
  total_resources_checked: number;
  valid_resources_count: number;
  profile_used: string;
  issues_summary: {
    errors: number;
    warnings: number;
    information: number;
  };
  issues: ValidationIssue[];
  resource_results: Record<string, ResourceValidationResult>;
}

export interface MappingRule {
  id: string;
  facility: string;
  rule_type: 'MISSING_UNIT' | 'LOCAL_TERMINOLOGY' | 'CUSTOM_Z_SEGMENT' | string;
  source_key: string;
  target_value: string;
  target_display: string;
  author: string;
  created_at: string;
  applied_count: number;
  notes?: string;
}

