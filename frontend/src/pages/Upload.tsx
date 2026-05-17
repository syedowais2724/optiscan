import { type DragEvent, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractDocument, uploadDocument } from "../api/client";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import type { Document, DocumentStatus } from "../types";

const acceptedTypes = ["image/jpeg", "image/png", "application/pdf"];

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClass(status: DocumentStatus) {
  return `status-badge status-badge-${status}`;
}

function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { documents, refreshDocuments, setSelectedDocument } = useAppContext();
  const toast = useToast();

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const previewUrl = useMemo(() => {
    if (!selectedFile || selectedFile.type === "application/pdf") {
      return null;
    }

    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const recentUploads = documents.slice(0, 5);
  const isBusy = isUploading || isExtracting;

  function selectFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setError("Unsupported file type. Please upload a JPG, PNG, or PDF document.");
      toast.error("Unsupported file type. Upload JPG, PNG, or PDF.");
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    setError(null);
    setIsUploading(true);

    let document: Document;

    try {
      document = await uploadDocument(selectedFile);
      setSelectedDocument(document);
      await refreshDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(message);
      toast.error(message);
      setIsUploading(false);
      return;
    }

    setIsUploading(false);
    setIsExtracting(true);

    try {
      await extractDocument(document.id);
      await refreshDocuments();
      navigate(`/review/${document.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed. Please try again.";
      setError(message);
      toast.error("Extraction failure. Review the upload and try again.");
    } finally {
      setIsExtracting(false);
    }
  }

  function openDocument(document: Document) {
    setSelectedDocument(document);
    navigate(`/review/${document.id}`);
  }

  return (
    <section className="mx-auto max-w-5xl space-y-7">
      <div
        className={`upload-dropzone flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 px-8 py-12 text-center${
          isDragging ? " upload-dropzone-active" : ""
        }`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          onChange={handleInputChange}
        />
        <div className="upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 6.5 8.5h3.4v6.2h4.2V8.5h3.4z" />
            <path d="M4.5 17.5h15v3h-15z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="upload-title">Drop manufacturing documents here</h2>
          <p className="upload-subtitle">JPG, PNG, or PDF - click to browse</p>
        </div>
      </div>

      {error ? <p className="inline-error px-4 py-3">{error}</p> : null}

      {selectedFile ? (
        <div className="upload-preview grid gap-5 p-5 md:grid-cols-[160px_1fr_auto] md:items-center">
          <div className="preview-media flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt={selectedFile.name} />
            ) : (
              <div className="pdf-preview-icon" aria-label="PDF document">
                PDF
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="preview-title">{selectedFile.name}</h3>
            <div className="preview-meta flex flex-wrap gap-3">
              <span>{formatFileSize(selectedFile.size)}</span>
              <span>{selectedFile.type || "Unknown type"}</span>
            </div>
            {isExtracting ? (
              <p className="progress-step">Extracting data with AI...</p>
            ) : isUploading ? (
              <p className="progress-step">Uploading document...</p>
            ) : null}
          </div>

          <button
            className="primary-action flex items-center justify-center gap-2 px-5 py-3"
            type="button"
            disabled={!selectedFile || isBusy}
            onClick={handleUpload}
          >
            {isBusy ? <LoadingSpinner /> : null}
            <span>{isExtracting ? "Extracting" : isUploading ? "Uploading" : "Upload"}</span>
          </button>
        </div>
      ) : null}

      <section className="recent-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Recent Uploads</h2>
          <span className="section-meta">Last 5</span>
        </div>

        {recentUploads.length > 0 ? (
          <div className="space-y-2">
            {recentUploads.map((document) => (
              <button
                key={document.id}
                className="recent-row grid w-full gap-3 px-4 py-3 text-left md:grid-cols-[1fr_auto_auto]"
                type="button"
                onClick={() => openDocument(document)}
              >
                <span className="recent-filename">{document.original_filename}</span>
                <span className={getStatusClass(document.status)}>{document.status}</span>
                <span className="recent-time">{formatTimestamp(document.uploaded_at)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="page-muted">No documents uploaded yet.</p>
        )}
      </section>
    </section>
  );
}

export default Upload;
