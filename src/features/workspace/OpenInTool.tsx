/**
 * The wait between choosing a desk and arriving in it.
 *
 * A master can be large, so the transfer is not instant. This panel is what
 * stops the user being dropped into an empty tool wondering what happened: it
 * names the track and the desk, shows how far the transfer has got, can be
 * cancelled, and states the reason when it fails instead of navigating anyway.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import {
  describeLibraryTrackFailure,
  loadLibraryTrackIntoWorkingSet,
  type LibraryTrackLoadFailure,
} from "@/features/workspace/loadLibraryTrack";
import { formatBytes } from "@/lib/repoSync";
import type { TrackToolDef } from "@/lib/trackActions";
import type { Drop } from "@/types";

type Progress = { receivedBytes: number; totalBytes: number | null; percent: number | null };

type State =
  | { kind: "resolving" }
  | { kind: "fetching"; progress: Progress }
  | { kind: "failed"; reason: LibraryTrackLoadFailure };

export function OpenInTool({
  tool,
  drop,
  to,
  note,
  onClose,
}: {
  tool: TrackToolDef;
  drop: Drop;
  /** Destination, so a caller can deep-link a row rather than just the desk. */
  to?: string;
  /** Extra honesty line — which track of a release this actually is. */
  note?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ kind: "resolving" });

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setState({ kind: "resolving" });

    void loadLibraryTrackIntoWorkingSet(drop, {
      signal: controller.signal,
      onPhase: (phase) => {
        if (!live) return;
        if (phase.phase === "resolving") setState({ kind: "resolving" });
        else if (phase.phase === "fetching") setState({ kind: "fetching", progress: phase });
        else if (phase.phase === "failed") setState({ kind: "failed", reason: phase.reason });
      },
    }).then((ok) => {
      if (!live || !ok) return;
      navigate(to ?? tool.path);
      onClose();
    });

    return () => {
      live = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one transfer per attempt
  }, [attempt, drop.id]);

  const title = drop.title?.trim() || "Untitled";

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Opening ${title} in ${tool.label}`}
          data-testid="open-in-tool"
          className="mat-surface-strong w-full max-w-sm rounded-t-3xl border-t border-white/12 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:border"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-display text-base font-semibold text-white">
            {state.kind === "failed" ? `Could not open ${tool.label}` : `Opening in ${tool.label}`}
          </p>
          <p className="mt-1 truncate text-[13px] text-white/60" title={title}>
            {title}
          </p>
          {note && <p className="mt-0.5 text-[11px] text-white/35">{note}</p>}

          {state.kind === "failed" ? (
            <>
              <p className="mt-3 text-[13px] leading-relaxed text-white/70" role="alert">
                {describeLibraryTrackFailure(state.reason)}
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="btn btn-primary flex-1"
                  data-testid="open-in-tool-retry"
                >
                  Try again
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>{state.kind === "resolving" ? "Finding the master…" : transferLabel(state.progress)}</span>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  state.kind === "fetching" && state.progress.percent !== null
                    ? state.progress.percent
                    : undefined
                }
              >
                <div
                  className="h-full rounded-full bg-[rgb(var(--app-accent-rgb))] transition-[width] duration-200"
                  style={{
                    width:
                      state.kind === "fetching" && state.progress.percent !== null
                        ? `${state.progress.percent}%`
                        : "35%",
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-white/30">
                The desk works on the original master, not a watermarked copy.
              </p>
              <button type="button" onClick={onClose} className="btn btn-ghost mt-3 w-full">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </OverlayPortal>
  );
}

/** Bytes moved, and a total only when the server declared one. */
function transferLabel(p: Progress): string {
  if (p.totalBytes) return `${formatBytes(p.receivedBytes)} of ${formatBytes(p.totalBytes)}`;
  return `${formatBytes(p.receivedBytes)} transferred`;
}
