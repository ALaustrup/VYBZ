import { Link } from "react-router-dom";
import { Disc3, FolderOpen, X } from "lucide-react";
import {
  clearWorkingTrack,
  setWorkingTrackDawFolder,
} from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";
import {
  dawHintLabel,
  directoryPickerAvailable,
  pickDawProjectFolder,
} from "@/features/workspace/dawFolderLink";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  analyzer: "Scan",
  library: "Library",
  "tool-drop": "Drop",
  landing: "Landing",
};

/**
 * Song workspace hero strip — active track sits above Prepare desks.
 * OR-041: optional local DAW folder link (session only; no Ableton sync claim).
 */
export function SongWorkspaceBanner({ className }: { className?: string }) {
  const track = useWorkingTrack();
  const { showToast } = useSession();
  if (!track) return null;

  async function linkFolder() {
    if (!directoryPickerAvailable()) {
      showToast("Folder link needs Chrome or Edge.");
      return;
    }
    try {
      const link = await pickDawProjectFolder();
      if (!link) return;
      setWorkingTrackDawFolder(link);
      showToast(
        `Linked “${link.folderName}” this session · ${dawHintLabel(link.dawHint)} — not synced`,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      showToast((e as Error).message || "Could not read that folder");
    }
  }

  return (
    <div
      className={cx(
        "flex flex-col gap-1.5 border-b border-white/[0.06] bg-ink-950/80 px-4 py-2.5 backdrop-blur-md",
        className,
      )}
      data-testid="song-workspace-banner"
      data-working-source={track.source}
    >
      <div className="flex items-center gap-3">
        <Disc3 className="h-4 w-4 shrink-0 text-[rgb(var(--app-accent-rgb))]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-white/35">
            This track · {SOURCE_LABEL[track.source] ?? track.source}
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
            Fix
          </Link>
          <Link
            to="/tools/translate"
            className="rounded-lg px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/8 hover:text-white/85"
          >
            Listen check
          </Link>
          <Link
            to="/tools/metadata"
            className="rounded-lg px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/8 hover:text-white/85"
          >
            Names
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

      <div
        className="flex flex-wrap items-center gap-2 pl-7"
        data-testid="song-workspace-daw-link"
      >
        {track.dawFolder ? (
          <>
            <FolderOpen className="h-3.5 w-3.5 text-white/40" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-[11px] text-white/45">
              DAW folder: {track.dawFolder.folderName} ·{" "}
              {dawHintLabel(track.dawFolder.dawHint)} · {track.dawFolder.fileCount} files
              {track.dawFolder.hasAls ? " · .als seen" : ""}
              {track.dawFolder.hasDawproject ? " · .dawproject seen" : ""} — not synced
            </p>
            <button
              type="button"
              data-testid="song-workspace-daw-clear"
              className="rounded-lg px-2 py-0.5 text-[11px] text-white/45 hover:bg-white/8 hover:text-white/80"
              onClick={() => setWorkingTrackDawFolder(null)}
            >
              Unlink
            </button>
          </>
        ) : (
          <button
            type="button"
            data-testid="song-workspace-daw-link-btn"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] text-white/45 transition hover:bg-white/8 hover:text-white/80"
            onClick={() => void linkFolder()}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Link DAW folder
          </button>
        )}
      </div>
    </div>
  );
}
