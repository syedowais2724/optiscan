interface LoadingSpinnerProps {
  className?: string;
}

function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return <span className={`loading-spinner ${className}`} aria-hidden="true" />;
}

export default LoadingSpinner;
