import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { approveRecord, flagRecord, getDocument, updateRecord } from "../api/client";
import EmptyState from "../components/ui/EmptyState";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Skeleton from "../components/ui/Skeleton";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import type { Document, OperationalRecord, OperationalRecordUpdate, ValidationIssue } from "../types";

type EditableField =
  | "date"
  | "shift"
  | "employee_number"
  | "operation_code"
  | "machine_number"
  | "work_order_number"
  | "quantity_produced"
  | "time_taken";

type FormState = Record<EditableField, string>;

const editableFields: Array<{
  key: EditableField;
  label: string;
  type: "text" | "date" | "number" | "select";
}> = [
  { key: "date", label: "Date", type: "date" },
  { key: "shift", label: "Shift", type: "select" },
  { key: "employee_number", label: "Employee Number", type: "text" },
  { key: "operation_code", label: "Operation Code", type: "text" },
  { key: "machine_number", label: "Machine Number", type: "text" },
  { key: "work_order_number", label: "Work Order Number", type: "text" },
  { key: "quantity_produced", label: "Quantity Produced", type: "number" },
  { key: "time_taken", label: "Time Taken", type: "number" },
];

function toFormState(record: OperationalRecord | null): FormState {
  return {
    date: record?.date ?? "",
    shift: record?.shift ?? "",
    employee_number: record?.employee_number ?? "",
    operation_code: record?.operation_code ?? "",
    machine_number: record?.machine_number ?? "",
    work_order_number: record?.work_order_number ?? "",
    quantity_produced: record?.quantity_produced?.toString() ?? "",
    time_taken: record?.time_taken?.toString() ?? "",
  };
}

function getScore(record: OperationalRecord | null, field: string) {
  const scores = record?.confidence_scores;
  if (!scores || Array.isArray(scores)) {
    return null;
  }

  const score = scores[field];
  return typeof score === "number" ? score : null;
}

function confidenceClass(score: number | null) {
  if (score === null) {
    return "confidence-neutral";
  }
  if (score >= 0.8) {
    return "confidence-high";
  }
  if (score >= 0.6) {
    return "confidence-medium";
  }
  return "confidence-low";
}

function normalizeIssues(issues: OperationalRecord["validation_issues"]): ValidationIssue[] {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.filter((issue): issue is ValidationIssue => {
    return (
      typeof issue === "object" &&
      issue !== null &&
      "field" in issue &&
      "message" in issue &&
      "severity" in issue
    );
  });
}

function issueSeverityRank(issue: ValidationIssue) {
  return issue.severity === "error" ? 0 : 1;
}

function numberOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildUpdatePayload(form: FormState): OperationalRecordUpdate {
  return {
    date: form.date || null,
    shift: form.shift || null,
    employee_number: form.employee_number || null,
    operation_code: form.operation_code || null,
    machine_number: form.machine_number || null,
    work_order_number: form.work_order_number || null,
    quantity_produced: numberOrNull(form.quantity_produced),
    time_taken: numberOrNull(form.time_taken),
  };
}

function fileUrl(document: Document) {
  return `http://localhost:8000/uploads/${encodeURIComponent(document.filename)}`;
}

function Review() {
  const { id } = useParams();
  const documentId = Number(id);
  const { selectedDocument, setSelectedDocument, selectDocument } = useAppContext();
  const [record, setRecord] = useState<OperationalRecord | null>(null);
  const [form, setForm] = useState<FormState>(() => toFormState(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadDocument() {
      if (!Number.isFinite(documentId)) {
        setError("Invalid document id.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        await selectDocument(documentId);
        const loadedDocument = await getDocument(documentId);
        if (!isMounted) {
          return;
        }
        setSelectedDocument(loadedDocument);
        const latestRecord =
          loadedDocument.operational_records[loadedDocument.operational_records.length - 1] ?? null;
        setRecord(latestRecord);
        setForm(toFormState(latestRecord));
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load document.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      isMounted = false;
    };
  }, [documentId, selectDocument, setSelectedDocument]);

  const issues = useMemo(
    () => normalizeIssues(record?.validation_issues ?? null).sort((a, b) => issueSeverityRank(a) - issueSeverityRank(b)),
    [record],
  );

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const overallConfidence = record?.overall_confidence ?? null;

  function handleChange(field: EditableField, event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function refreshAfterRecordChange(nextRecord: OperationalRecord) {
    setRecord(nextRecord);
    setForm(toFormState(nextRecord));
    if (Number.isFinite(documentId)) {
      const refreshedDocument = await getDocument(documentId);
      setSelectedDocument(refreshedDocument);
    }
  }

  async function saveRecord(showToast = true) {
    if (!record) {
      return null;
    }

    const updatedRecord = await updateRecord(record.id, buildUpdatePayload(form));
    await refreshAfterRecordChange(updatedRecord);
    if (showToast) {
      toast.success("Changes saved and validations refreshed.");
    }
    return updatedRecord;
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await saveRecord();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove() {
    if (!record) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveRecord(false);
      const approvedRecord = await approveRecord(record.id);
      await refreshAfterRecordChange(approvedRecord);
      toast.success("Record approved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve record.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFlag() {
    if (!record) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const flaggedRecord = await flagRecord(record.id);
      await refreshAfterRecordChange(flaggedRecord);
      toast.warning("Record flagged for review.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to flag record.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ReviewSkeleton />;
  }

  if (!selectedDocument) {
    return <p className="inline-error px-4 py-3">Document not found.</p>;
  }

  if (!record) {
    return (
      <section className="review-empty p-6">
        <EmptyState
          heading="No extracted record available"
          subtext="Run extraction for this document before reviewing fields."
        />
      </section>
    );
  }

  return (
    <section className="review-grid grid gap-6">
      <div className="document-preview-panel p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">{selectedDocument.original_filename}</h2>
            <p className="page-muted mt-1">{selectedDocument.file_type.toUpperCase()} source</p>
          </div>
          <span className={`status-badge status-badge-${selectedDocument.status}`}>
            {selectedDocument.status}
          </span>
        </div>

        <div className="document-canvas flex items-center justify-center">
          {selectedDocument.file_type === "pdf" ? (
            <embed src={fileUrl(selectedDocument)} type="application/pdf" />
          ) : (
            <img src={fileUrl(selectedDocument)} alt={selectedDocument.original_filename} />
          )}
        </div>
      </div>

      <aside className="results-panel flex flex-col">
        <div className="results-scroll space-y-5 p-5">
          <div className="review-panel-header flex items-start justify-between gap-4">
            <div>
              <p className="page-muted">Overall Confidence</p>
              <p className={`overall-confidence ${confidenceClass(overallConfidence)}`}>
                {overallConfidence === null ? "--" : `${Math.round(overallConfidence * 100)}%`}
              </p>
            </div>
            <span className={`review-status-badge review-status-${record.review_status}`}>
              {record.review_status}
            </span>
          </div>

          {error ? <p className="inline-error px-4 py-3">{error}</p> : null}

          <section className="editor-section space-y-4">
            <h2 className="section-title">Field Editor</h2>
            <div className="space-y-3">
              {editableFields.map((field) => {
                const score = getScore(record, field.key);
                return (
                  <label
                    key={field.key}
                    className={`field-row grid gap-3 p-3 ${confidenceClass(score)}`}
                  >
                    <span className="field-label">{field.label}</span>
                    <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                      {field.type === "select" ? (
                        <select
                          value={form[field.key]}
                          onChange={(event) => handleChange(field.key, event)}
                        >
                          <option value="">Unassigned</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={form[field.key]}
                          step={field.key === "time_taken" ? "0.1" : undefined}
                          onChange={(event) => handleChange(field.key, event)}
                        />
                      )}
                      <div className="confidence-meter">
                        <div className="confidence-track">
                          <span style={{ width: `${Math.max((score ?? 0) * 100, 4)}%` }} />
                        </div>
                        <span>{score === null ? "--" : `${Math.round(score * 100)}%`}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="validation-section space-y-4">
            <h2 className="section-title">Validation Issues</h2>
            {issues.length === 0 ? (
              <div className="validation-passed px-4 py-3">All validations passed</div>
            ) : (
              <div className="space-y-4">
                {errors.length > 0 ? (
                  <div className="space-y-2">
                    {errors.map((issue) => (
                      <IssueRow key={`${issue.field}-${issue.rule}-${issue.message}`} issue={issue} />
                    ))}
                  </div>
                ) : null}
                {warnings.length > 0 ? (
                  <div className="space-y-2">
                    {warnings.map((issue) => (
                      <IssueRow key={`${issue.field}-${issue.rule}-${issue.message}`} issue={issue} />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <div className="review-action-bar grid gap-3 p-5 md:grid-cols-3">
          <button className="secondary-action flex items-center justify-center gap-2 px-4 py-3" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <LoadingSpinner /> : null}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button className="approve-action flex items-center justify-center gap-2 px-4 py-3" type="button" onClick={handleApprove} disabled={isSaving}>
            {isSaving ? <LoadingSpinner /> : null}
            <span>Approve Record</span>
          </button>
          <button className="flag-action flex items-center justify-center gap-2 px-4 py-3" type="button" onClick={handleFlag} disabled={isSaving}>
            {isSaving ? <LoadingSpinner /> : null}
            <span>Flag for Review</span>
          </button>
        </div>
      </aside>
    </section>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className="issue-row grid gap-3 px-4 py-3 md:grid-cols-[auto_1fr]">
      <span className={`issue-pill issue-pill-${issue.severity}`}>{issue.severity}</span>
      <p>
        <span>{issue.field}</span>
        <span> - {issue.message}</span>
      </p>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <section className="review-grid grid gap-6">
      <div className="document-preview-panel p-4">
        <Skeleton className="mb-4 h-12" />
        <Skeleton className="h-[520px]" />
      </div>
      <aside className="results-panel p-5">
        <Skeleton className="mb-5 h-24" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton className="mb-3 h-20" key={index} />
        ))}
      </aside>
    </section>
  );
}

export default Review;
