import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render errors so one bad screen shows a recoverable message instead of
 * blanking the entire app. Pairs with defensive data access (e.g. categoryMeta).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Surface in the console for debugging; no PII.
    console.error("MYVYB render error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex flex-col items-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
            style={{
              background: "rgba(168,124,248,0.10)",
              border: "1.5px solid rgba(168,124,248,0.4)",
              boxShadow: "0 0 36px -8px rgba(168,124,248,0.6)",
            }}
            aria-hidden
          >
            🌫️
          </span>
          <div
            className="mt-4 h-px w-40"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(168,124,248,0.8), transparent)",
            }}
          />
        </div>
        <p className="font-display text-xl font-semibold text-white">
          This slipped behind the veil
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-white/55">
          The screen hit a snag. A quick reload usually lifts it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-veil-500 px-6 py-3 font-display font-semibold text-white shadow-glow transition active:scale-95"
        >
          Reload VYBZ
        </button>
      </div>
    );
  }
}
