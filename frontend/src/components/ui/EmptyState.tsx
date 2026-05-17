import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  subtext: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

function EmptyState({ icon, heading, subtext, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="empty-state flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="empty-state-icon" aria-hidden="true">
        {icon ?? <DefaultIcon />}
      </div>
      <div>
        <h2 className="section-title">{heading}</h2>
        <p className="page-muted mt-2">{subtext}</p>
      </div>
      {ctaLabel && onCtaClick ? (
        <button className="primary-action px-4 py-3" type="button" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

function DefaultIcon() {
  return (
    <svg viewBox="0 0 120 90">
      <rect x="20" y="18" width="80" height="54" rx="6" />
      <path d="M35 34h50M35 46h38M35 58h28" />
      <circle cx="88" cy="64" r="10" />
    </svg>
  );
}

export default EmptyState;
