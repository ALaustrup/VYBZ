import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { ContextMenu, type MenuAnchor } from "@/components/menu/ContextMenu";
import { ReportModal } from "@/components/ReportModal";
import { OpenInTool } from "@/features/workspace/OpenInTool";
import { OverlayPortal } from "@/lib/overlayPortal";
import { buildTrackActions, trackFileSummary, type TrackToolDef } from "@/lib/trackActions";
import { enqueueTracks, isPlayableMediaUrl, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { useSession } from "@/store/session";
import { useOnline } from "@/lib/useOnline";
import * as api from "@/lib/api";
import type { Drop, Reaction } from "@/types";
import { ValidateHumanitySheet } from "@/features/provenance/ValidateHumanitySheet";
import { PlaceOnVybzSheet } from "@/features/profile/PlaceOnVybzSheet";

type TrackLike = Drop & { myReaction?: Reaction; myRating?: number };

export type TrackActionMenuProps = {
  drop: TrackLike;
  open: boolean;
  anchor: MenuAnchor | null;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
  /** Called after a destructive or mutating action so the list can refresh. */
  onChanged?: (change: { kind: "deleted" | "renamed" | "featured" | "placed"; dropId: string; title?: string }) => void;
  onPlay?: () => void;
  onReact?: (r: Reaction) => void;
  onRate?: () => void;
  isFeatured?: boolean;
  onStage?: boolean;
  snapshotDropIds?: string[];
};

/**
 * The single contextual action surface for a track. Every action here is wired to a
 * real API call, player command, or navigation — nothing is decorative.
 */
export function TrackActionMenu({
  drop,
  open,
  anchor,
  onClose,
  returnFocusTo,
  onChanged,
  onPlay,
  onReact,
  onRate,
  isFeatured = false,
  onStage = false,
  snapshotDropIds,
}: TrackActionMenuProps) {
  const navigate = useNavigate();
  const player = usePlayer();
  const online = useOnline();
  const { userId, profile, showToast } = useSession();
  const [stage, setStage] = useState<"menu" | "confirm-delete" | "rename" | "details" | "tool" | "place">(
    "menu"
  );
  const [tool, setTool] = useState<TrackToolDef | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [humanityOpen, setHumanityOpen] = useState(false);

  const isOwner = Boolean(userId && drop.authorId === userId);
  const isCurrent = player.track?.id === drop.id;

  const reset = useCallback(() => {
    setStage("menu");
    setTool(null);
    setBusy(false);
    onClose();
  }, [onClose]);

  const groups = useMemo(
    () =>
      buildTrackActions(
        {
          drop,
          viewerId: userId ?? null,
          isOwner,
          isCurrent,
          isPlaying: isCurrent && player.playing,
          isPlayable: isPlayableMediaUrl(drop.audioUrl),
          hasAsset: Boolean(drop.assetId),
          online,
          isFeatured,
          onStage,
          hasVybbed: drop.myReaction === "feel",
        },
        {
          play: () => onPlay?.(),
          playNext: () => {
            enqueueTracks([toPlayerTrack(drop)], { playFirst: false });
            showToast("Queued next");
          },
          addToQueue: () => {
            enqueueTracks([toPlayerTrack(drop)], { playFirst: false });
            showToast("Added to queue");
          },
          addToVibesRadio: () => void runAddToVibesRadio(),
          favourite: () => onReact?.("feel"),
          rate: () => onRate?.(),
          openArtist: () => {
            if (!drop.authorId) return;
            if (isOwner) navigate("/");
            else navigate(`/u/${drop.authorId}`);
          },
          openTrack: () => navigate(`/track/${drop.id}`),
          viewDetails: () => setStage("details"),
          copyArtistLink: () => {
            if (!drop.authorId) return;
            const url = `${window.location.origin}/u/${drop.authorId}`;
            void navigator.clipboard
              ?.writeText(url)
              .then(() => showToast("Artist link copied"))
              .catch(() => showToast("Could not copy link"));
          },
          download: () => void runDownload(),
          rename: () => {
            setRenameValue(drop.title ?? "");
            setStage("rename");
          },
          placeOnVybz: () => setStage("place"),
          report: () => setReportOpen(true),
          validateHumanity: () => setHumanityOpen(true),
          requestDelete: () => setStage("confirm-delete"),
          openInTool: (next) => {
            setTool(next);
            setStage("tool");
          },
        }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drop, userId, isOwner, isCurrent, player.playing, online, isFeatured, onStage]
  );

  async function runDownload() {
    if (!drop.assetId) return;
    const res = await api.downloadAsset(drop.assetId);
    if (!res) {
      showToast("Download unavailable for this asset");
      return;
    }
    const a = document.createElement("a");
    a.href = res.url;
    a.rel = "noopener";
    a.download = `${(drop.title || "track").replace(/[^\w.-]+/g, "_")}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (res.revoke) setTimeout(() => URL.revokeObjectURL(res.url), 10_000);
    showToast(res.watermarked ? "Downloaded — watermarked for attribution" : "Downloaded");
  }

  async function runAddToVibesRadio() {
    const url = drop.audioUrl;
    if (!url || !isPlayableMediaUrl(url)) {
      showToast("This drop has no playable audio yet");
      return;
    }
    const durationSec = drop.durationSec && drop.durationSec > 0 ? drop.durationSec : null;
    if (!durationSec) {
      showToast("Duration not measured for this track yet");
      return;
    }
    setBusy(true);
    const { optInToVibesRadio } = await import("@/features/radio/vibesRadio");
    const res = await optInToVibesRadio({
      dropId: drop.id,
      audioUrl: url,
      title: drop.title ?? undefined,
      artist: drop.authorUsername ?? null,
      durationSec,
    });
    setBusy(false);
    if (res.ok) {
      showToast("Added to Vibes Radio");
      reset();
    } else {
      showToast(`Could not add to Vibes Radio — ${res.error}`);
    }
  }

  async function confirmRename() {
    setBusy(true);
    const title = renameValue.trim();
    const ok = await api.updateDropTitle(drop.id, title);
    setBusy(false);
    if (ok) {
      showToast("Renamed");
      onChanged?.({ kind: "renamed", dropId: drop.id, title });
      reset();
    } else {
      showToast("Could not rename");
    }
  }

  async function confirmDelete() {
    setBusy(true);
    const ok = await api.deleteDrop(drop.id);
    setBusy(false);
    if (ok) {
      showToast("Track deleted");
      onChanged?.({ kind: "deleted", dropId: drop.id });
      reset();
    } else {
      showToast("Could not delete");
    }
  }

  const report = (
    <ReportModal
      open={reportOpen}
      onClose={() => {
        setReportOpen(false);
        reset();
      }}
      targetKind="drop"
      targetId={drop.id}
      targetLabel={drop.title?.trim() || drop.authorUsername || "track"}
    />
  );

  if (!open) return null;

  if (stage === "menu") {
    return (
      <>
        <ContextMenu
          open={!reportOpen && !humanityOpen}
          anchor={anchor}
          groups={groups}
          title={drop.title?.trim() || "Untitled"}
          subtitle={drop.authorUsername ? `@${drop.authorUsername}` : undefined}
          onClose={reset}
          returnFocusTo={returnFocusTo}
        />
        {report}
        {userId && (
          <ValidateHumanitySheet
            open={humanityOpen}
            onClose={() => {
              setHumanityOpen(false);
              reset();
            }}
            hostId={userId}
            assetId={drop.assetId ?? null}
            title={drop.title?.trim() || "Untitled"}
          />
        )}
      </>
    );
  }

  if (stage === "place") {
    return (
      <PlaceOnVybzSheet
        open
        drops={[drop]}
        snapshotDropIds={snapshotDropIds ?? []}
        profile={profile}
        onClose={reset}
        onChanged={() => onChanged?.({ kind: "placed", dropId: drop.id })}
      />
    );
  }

  if (stage === "tool" && tool) {
    return (
      <OpenInTool
        tool={tool}
        drop={drop}
        // Metadata edits the library row itself, so name the row when the
        // viewer owns it. Other viewers get the desk with the master loaded.
        to={tool.id === "metadata" && isOwner ? `${tool.path}?drop=${drop.id}` : undefined}
        onClose={reset}
      />
    );
  }

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={reset}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            stage === "confirm-delete" ? "Confirm delete" : stage === "rename" ? "Rename track" : "File details"
          }
          className="mat-surface-strong w-full max-w-sm rounded-t-3xl border-t border-white/12 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:border"
          onClick={(e) => e.stopPropagation()}
        >
          {stage === "confirm-delete" && (
            <>
              <p className="font-display text-base font-semibold text-white">Delete this track?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                “{drop.title?.trim() || "Untitled"}” will be removed from your library and from every
                listener&apos;s feed. This cannot be undone from here.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="btn btn-ghost flex-1"
                  data-testid="track-delete-cancel"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmDelete()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-wild/80 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
                  data-testid="track-delete-confirm"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </>
          )}

          {stage === "rename" && (
            <>
              <p className="font-display text-base font-semibold text-white">Rename track</p>
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value.slice(0, 80))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmRename();
                }}
                placeholder="Track title"
                data-testid="track-rename-input"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
              />
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={reset} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmRename()}
                  className="btn btn-primary flex-1"
                  data-testid="track-rename-save"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </>
          )}

          {stage === "details" && (
            <>
              <p className="font-display text-base font-semibold text-white">File details</p>
              <dl className="mt-3 divide-y divide-[var(--hairline)]" data-testid="track-file-details">
                {trackFileSummary(drop).map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-white/35">{row.label}</dt>
                    <dd className="min-w-0 truncate text-right text-[13px] text-white/80">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-snug text-white/30">
                Values shown are those stored with the upload. Fields VYBZ has not measured are omitted
                rather than estimated.
              </p>
              <button type="button" onClick={reset} className="btn btn-ghost mt-3 w-full">
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </OverlayPortal>
  );
}
