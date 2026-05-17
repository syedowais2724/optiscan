import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/dashboard/StatCard";
import { getAnalyticsSummary, listDocuments } from "../api/client";
import Skeleton from "../components/ui/Skeleton";
import type { AnalyticsSummary, Document, MachineSummaryItem } from "../types";

type SortKey = keyof Pick<MachineSummaryItem, "machine_number" | "records" | "total_quantity" | "avg_time">;

const emptySummary: AnalyticsSummary = {
  total_documents: 0,
  total_records: 0,
  pending_review: 0,
  validation_failures: 0,
  approved_today: 0,
  shift_summary: [],
  machine_summary: [],
  confidence_distribution: { high: 0, medium: 0, low: 0 },
};

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("records");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const [analytics, recentDocuments] = await Promise.all([
          getAnalyticsSummary(),
          listDocuments(0, 5),
        ]);
        if (!isMounted) {
          return;
        }
        setSummary(analytics);
        setDocuments(recentDocuments);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const shiftData = useMemo(
    () =>
      ["A", "B", "C"].map((shift) => {
        const row = summary.shift_summary.find((item) => item.shift === shift);
        return { 
          shift, 
          quantity: row?.total_quantity ?? 0,
          fill: shift === "A" ? "var(--accent)" : shift === "B" ? "var(--info)" : "var(--success)"
        };
      }),
    [summary.shift_summary],
  );

  const confidenceData = [
    { name: "High", value: summary.confidence_distribution.high, fill: "var(--success)" },
    { name: "Medium", value: summary.confidence_distribution.medium, fill: "var(--warning)" },
    { name: "Low", value: summary.confidence_distribution.low, fill: "var(--danger)" },
  ];

  const sortedMachines = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...summary.machine_summary].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [sortDirection, sortKey, summary.machine_summary]);

  function changeSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="space-y-6">
      {error ? <p className="inline-error px-4 py-3">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Documents" value={summary.total_documents} tone="info" icon={<StatIcon path="M4 3h11l5 5v13H4zM14 3v6h6" />} />
        <StatCard label="Total Records" value={summary.total_records} tone="accent" icon={<StatIcon path="M4 5h16v4H4zM4 11h16v4H4zM4 17h16v2H4z" />} />
        <StatCard label="Pending Review" value={summary.pending_review} tone="warning" icon={<StatIcon path="M12 3a9 9 0 1 0 9 9h-9zM12 3v9h9a9 9 0 0 0-9-9z" />} />
        <StatCard label="Validation Failures" value={summary.validation_failures} tone="danger" icon={<StatIcon path="M12 2 2 20h20zM11 8h2v6h-2zM11 16h2v2h-2z" />} />
        <StatCard label="Approved Today" value={summary.approved_today} tone="success" icon={<StatIcon path="m9 16.2-3.5-3.5L4 14.2 9 19 20.5 7.5 19 6z" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="dashboard-panel p-5">
          <h2 className="section-title">Shift Summary</h2>
          <div className="chart-frame mt-4" style={{ background: 'transparent' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={shiftData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <rect width="100%" height="100%" fill="transparent" />
                </defs>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="shift" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }} />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]} background={{ fill: 'transparent' }}>
                  {shiftData.map((entry) => (
                    <Cell key={entry.shift} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel p-5">
          <h2 className="section-title">Confidence Distribution</h2>
          <div className="chart-frame mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={confidenceData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={105} paddingAngle={4}>
                  {confidenceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {confidenceData.map((item) => (
              <div key={item.name} className="legend-chip px-3 py-2">
                <span style={{ background: item.fill }} />
                <p>{item.name}</p>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="dashboard-panel p-5">
          <h2 className="section-title">Machine Summary</h2>
          <div className="table-wrap mt-4">
            <table className="ops-table">
              <thead>
                <tr>
                  <SortableHeader label="Machine" column="machine_number" sortKey={sortKey} direction={sortDirection} onSort={changeSort} />
                  <SortableHeader label="Records" column="records" sortKey={sortKey} direction={sortDirection} onSort={changeSort} />
                  <SortableHeader label="Total Qty" column="total_quantity" sortKey={sortKey} direction={sortDirection} onSort={changeSort} />
                  <SortableHeader label="Avg Time" column="avg_time" sortKey={sortKey} direction={sortDirection} onSort={changeSort} />
                </tr>
              </thead>
              <tbody>
                {sortedMachines.map((machine) => (
                  <tr key={machine.machine_number ?? "unassigned"}>
                    <td>{machine.machine_number ?? "Unassigned"}</td>
                    <td>{machine.records}</td>
                    <td>{machine.total_quantity}</td>
                    <td>{machine.avg_time === null ? "--" : machine.avg_time.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedMachines.length === 0 ? <p className="page-muted p-4">No machine data yet.</p> : null}
          </div>
        </section>

        <section className="dashboard-panel p-5">
          <h2 className="section-title">Recent Activity</h2>
          <div className="mt-4 space-y-2">
            {documents.map((document) => (
              <button
                key={document.id}
                className="activity-row grid w-full gap-2 px-4 py-3 text-left"
                type="button"
                onClick={() => navigate(`/review/${document.id}`)}
              >
                <span className="recent-filename">{document.original_filename}</span>
                <span className={`status-badge status-badge-${document.status}`}>{document.status}</span>
                <span className="recent-time">{formatTimestamp(document.uploaded_at)}</span>
              </button>
            ))}
            {documents.length === 0 ? <p className="page-muted">No recent activity.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function StatIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip px-3 py-2">
      <p>{label ?? payload[0].name}</p>
      <strong>{payload[0].value}</strong>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sortKey,
  direction,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  direction: "asc" | "desc";
  onSort: (column: SortKey) => void;
}) {
  return (
    <th>
      <button type="button" onClick={() => onSort(column)}>
        {label}
        {sortKey === column ? <span>{direction === "asc" ? "up" : "down"}</span> : null}
      </button>
    </th>
  );
}

function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton className="h-28" key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-80" />
    </section>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default Dashboard;
