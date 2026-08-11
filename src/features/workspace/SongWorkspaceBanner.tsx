import { Link } from "react-router-dom";
import { Disc3, X } from "lucide-react";
import { clearWorkingTrack } from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";
import { cx } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  analyzer: "Analyzer",
  library: "Library",
  "tool-drop": "Desk drop",
  landing: "Landing",
};

/**
 * Song workspace hero strip — active track sits above Prepare desks.
 * Calm, information-dense; no dashboard chrome.
 */
export function SongWorkspaceBanner({ className }: { className?: string }) {
  const track = useWorkingTrack();
  if (!track) return null;

  return (
    <div
      className={cx(
        "flex items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 py-2.5 backdrop-blur-md",
        className,
      )}
      data-testid="song-workspace-banner"
      data-working-source={track.source}
    >
      <Disc3 className="h-4 w-4 shrink-0 text-[rgb(var(--app-accent-rgb))]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] uppercase tracking-[0.14em] text-white/35">
          Song workspace · {SOURCE_LABEL[track.source] ?? track.source}
        </p>
        <p className="truncate font-display text-sm font-semibold text-white/90">
          {track.title || track.fileName}
          {track.artistName ? (
            <span className="font-sans text-xs font-normal text-white/45"> · {track.artistName}</span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          to="/tools/correct"
          className="rounded-lg px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/8 hover:text-white/85"
        >
          Correct
        </Link>
        <Link
          to="/tools/translate"
          className="rounded-lg px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/8 hover:text-white/85"
        >
          Translation Lab
        </Link>
        <Link
          to="/tools/metadata"
          className="rounded-lg px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/8 hover:text-white/85"
        >
          Metadata
        </Link>
        <button
          type="button"
          aria-label="Clear song workspace"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white/80"
          onClick={() => clearWorkingTrack()}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
