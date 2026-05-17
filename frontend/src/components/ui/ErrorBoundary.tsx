import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application crash", error, info);
  }

  recover = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="recovery-screen flex min-h-screen items-center justify-center px-6">
          <section className="recovery-card p-8 text-center">
            <div className="empty-state-icon mx-auto" aria-hidden="true">
              <svg viewBox="0 0 120 90">
                <path d="M24 66 60 18l36 48z" />
                <path d="M60 36v16M60 60v4" />
              </svg>
            </div>
            <h1 className="mt-5">OptiScan hit a fault</h1>
            <p className="page-muted mt-3">
              The console recovered to a safe screen. Try again, or reload if the issue persists.
            </p>
            <button className="primary-action mt-6 px-5 py-3" type="button" onClick={this.recover}>
              Recover
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
