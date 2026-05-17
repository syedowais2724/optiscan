import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDocuments } from "../api/client";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import type { Document, DocumentStatus } from "../types";

const pageSize = 10;
const statuses: Array<DocumentStatus | "all"> = [
  "all",
  "pending",
  "processing",
  "extracted",
  "reviewed",
  "failed",
];

function History() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DocumentStatus | "all">("all");
  const [shift, setShift] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listDocuments(0, 1000);
        if (isMounted) {
          setDocuments(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load documents.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [endDate, query, shift, startDate, status]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return documents.filter((document) => {
      const workOrders = document.operational_records
        .map((record) => record.work_order_number ?? "")
        .join(" ")
        .toLowerCase();
      const shifts = document.operational_records.map((record) => record.shift ?? "");
      const uploadedDate = document.uploaded_at.slice(0, 10);

      const matchesQuery =
        !normalizedQuery ||
        document.original_filename.toLowerCase().includes(normalizedQuery) ||
        workOrders.includes(normalizedQuery);
      const matchesStatus = status === "all" || document.status === status;
      const matchesShift = shift === "all" || shifts.includes(shift);
      const matchesStart = !startDate || uploadedDate >= startDate;
      const matchesEnd = !endDate || uploadedDate <= endDate;

      return matchesQuery && matchesStatus && matchesShift && matchesStart && matchesEnd;
    });
  }, [documents, endDate, query, shift, startDate, status]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedDocuments = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (isLoading) {
    return <HistorySkeleton />;
  }

  return (
    <section className="space-y-5">
      {error ? <p className="inline-error px-4 py-3">{error}</p> : null}

      <div className="history-filters grid gap-3 p-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr]">
        <input
          aria-label="Search documents"
          placeholder="Search filename or work order"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus | "all")}>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All statuses" : item}
            </option>
          ))}
        </select>
        <select value={shift} onChange={(event) => setShift(event.target.value)}>
          <option value="all">All shifts</option>
          <option value="A">Shift A</option>
          <option value="B">Shift B</option>
          <option value="C">Shift C</option>
        </select>
        <input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <input aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
      </div>

      <section className="dashboard-panel p-5">
        {pagedDocuments.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="ops-table history-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th>Records</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDocuments.map((document) => (
                    <tr key={document.id} onClick={() => navigate(`/review/${document.id}`)}>
                      <td>{document.original_filename}</td>
                      <td>{formatTimestamp(document.uploaded_at)}</td>
                      <td>
                        <span className={`status-badge status-badge-${document.status}`}>{document.status}</span>
                      </td>
                      <td>{document.operational_records.length}</td>
                      <td>
                        <button
                          className="table-action px-3 py-2"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/review/${document.id}`);
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-row mt-4 flex items-center justify-between gap-3">
              <p className="page-muted">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button className="table-action px-3 py-2" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </button>
                <button className="table-action px-3 py-2" type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            heading={documents.length === 0 ? "No uploads yet" : "No matching documents"}
            subtext={
              documents.length === 0
                ? "Upload a manufacturing document to start building your review history."
                : "Adjust filters or upload a manufacturing document."
            }
            ctaLabel={documents.length === 0 ? "Upload Document" : undefined}
            onCtaClick={documents.length === 0 ? () => navigate("/upload") : undefined}
          />
        )}
      </section>
    </section>
  );
}

function HistorySkeleton() {
  return (
    <section className="space-y-5">
      <Skeleton className="h-20" />
      <section className="dashboard-panel p-5">
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton className="h-12" key={index} />
          ))}
        </div>
      </section>
    </section>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default History;
