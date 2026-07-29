import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional label for logs (e.g. route path). Never shown as stack. */
  label?: string;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render errors so one bad screen shows a recoverable message instead of
 * blanking the entire app. No stack traces in the UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const where = this.props.label ? ` [${this.props.label}]` : "";
    console.error(`VYBZ ErrorBoundary${where}:`, error instanceof Error ? error.message : error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center"
        role="alert"
        data-testid="error-boundary"
      >
        <div className="glass-vibrant flex h-16 w-16 items-center justify-center rounded-full text-2xl text-snow" aria-hidden>
          !
        </div>
        <p className="font-display text-xl font-semibold text-white">Something slipped</p>
        <p className="max-w-xs text-sm leading-relaxed text-white/55">
          This screen hit a snag. A quick reload usually clears it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary rounded-2xl px-6 py-3 font-display font-semibold"
        >
          Reload VYBZ
        </button>
      </div>
    );
  }
}
