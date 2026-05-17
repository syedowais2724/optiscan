export type DocumentFileType = "image" | "pdf";
export type DocumentStatus = "pending" | "processing" | "extracted" | "reviewed" | "failed";
export type ReviewStatus = "pending" | "approved" | "flagged";
export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  field: string;
  rule: string;
  message: string;
  severity: ValidationSeverity;
}

export interface OperationalRecord {
  id: number;
  document_id: number;
  date: string | null;
  shift: string | null;
  employee_number: string | null;
  operation_code: string | null;
  machine_number: string | null;
  work_order_number: string | null;
  quantity_produced: number | null;
  time_taken: number | null;
  raw_extracted_json: string | null;
  confidence_scores: Record<string, number> | unknown[] | null;
  validation_issues: ValidationIssue[] | Record<string, unknown> | null;
  overall_confidence: number | null;
  review_status: ReviewStatus;
  reviewed_at: string | null;
}

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_type: DocumentFileType;
  file_path: string;
  status: DocumentStatus;
  uploaded_at: string;
  operational_records: OperationalRecord[];
}

export interface OperationalRecordUpdate {
  date?: string | null;
  shift?: string | null;
  employee_number?: string | null;
  operation_code?: string | null;
  machine_number?: string | null;
  work_order_number?: string | null;
  quantity_produced?: number | null;
  time_taken?: number | null;
  raw_extracted_json?: string | null;
  confidence_scores?: Record<string, number> | unknown[] | null;
  validation_issues?: ValidationIssue[] | Record<string, unknown> | null;
  overall_confidence?: number | null;
  review_status?: ReviewStatus | null;
  reviewed_at?: string | null;
}

export interface RecordSearchParams {
  date?: string;
  shift?: string;
  machine_number?: string;
  work_order_number?: string;
  review_status?: ReviewStatus;
}

export interface ShiftSummaryItem {
  shift: string | null;
  count: number;
  total_quantity: number;
}

export interface MachineSummaryItem {
  machine_number: string | null;
  records: number;
  total_quantity: number;
  avg_time: number | null;
}

export interface ConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface AnalyticsSummary {
  total_documents: number;
  total_records: number;
  pending_review: number;
  validation_failures: number;
  approved_today: number;
  shift_summary: ShiftSummaryItem[];
  machine_summary: MachineSummaryItem[];
  confidence_distribution: ConfidenceDistribution;
}
