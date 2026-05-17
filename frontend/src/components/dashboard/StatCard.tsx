import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone: "accent" | "success" | "warning" | "danger" | "info";
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <article className={`stat-card stat-card-${tone} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-3">{value}</p>
        </div>
        <span className="stat-icon flex items-center justify-center">{icon}</span>
      </div>
    </article>
  );
}

export default StatCard;
