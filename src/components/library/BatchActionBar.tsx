import { useRef, useState } from "react";
import { Download, ListPlus, Sparkles, StretchHorizontal, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OverlayPortal } from "@/lib/overlayPortal";
import { runBatch, describeOutcome, type BatchProgress } from "@/lib/batchRunner";
import { enqueueTracks, isPlayableMediaUrl } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";

type Pending = { kind: "delete"; ids: string[] } | null;

/**
 * Batch bar for the media library. Only offers operations that exist for a drop today:
 * queueing, downloading, and deleting. Destructive work always passes through an
 * explicit confirmation, and every run reports partial success honestly.
 */
export function BatchActionBar({
  drops,
  selectedIds,
  onClear,
  onDeleted,
  onPlace,
}: {
  /** All currently visible drops, used to resolve selected ids to records. */
  drops: Drop[];
  selectedIds: string[];
  onClear: () => void;
  onDeleted: (ids: string[]) => void;
  onPlace?: (drops: Drop[]) => void;
}) {
  const { showToast } = useSession();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const cancelRef = useRef(false);

  const byId = new Map(drops.map((d) => [d.id, d]));
  const selected = selectedIds.map((id) => byId.get(id)).filter((d): d is Drop => Boolean(d));
  const count = selected.length;
  const playable = selected.filter((d) => isPlayableMediaUrl(d.audioUrl));
  const downloadable = selected.filter((d) => Boolean(d.assetId));
  const running = progress !== null;

  if (count === 0 && !running && !pending) return null;

  function livingMix() {
    if (!playable.length) {
      showToast("None of the selected tracks have playable audio");
      return;
    }
    navigate("/library/mix", { state: { dropIds: playable.map((d) => d.id) } });
    onClear();
  }

  function queueAll() {
    if (!playable.length) {
      showToast("None of the selected tracks have playable audio");
      return;
    }
    enqueueTracks(playable.map(toPlayerTrack), { playFirst: false });
    showToast(`${playable.length} added to queue`);
    onClear();
  }

  async function downloadAll() {
    if (!downloadable.length) {
      showToast("None of the selected tracks have a downloadable file");
      return;
    }
    cancelRef.current = false;
    const outcome = await runBatch(
      downloadable.map((d) => d.id),
      async (id) => {
        const drop = byId.get(id);
        if (!drop?.assetId) throw new Error("No asset");
        const res = await api.downloadAsset(drop.assetId);
        if (!res) throw new Error("Download unavailable");
        const a = document.createElement("a");
        a.href = res.url;
        a.rel = "noopener";
        a.download = `${(drop.title || "track").replace(/[^\w.-]+/g, "_")}.wav`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (res.revoke) setTimeout(() => URL.revokeObjectURL(res.url), 10_000);
      },
      { onProgress: setProgress, shouldCancel: () => cancelRef.current }
    );
    setProgress(null);
    showToast(describeOutcome(outcome, "downloaded"));
  }

  async function deleteAll(ids: string[]) {
    setPending(null);
    cancelRef.current = false;
    const outcome = await runBatch(
      ids,
      async (id) => {
        const ok = await api.deleteDrop(id);
        if (!ok) throw new Error("Delete refused");
      },
      { onProgress: setProgress, shouldCancel: () => cancelRef.current }
    );
    setProgress(null);
    if (outcome.succeeded.length) onDeleted(outcome.succeeded);
    showToast(describeOutcome(outcome, "deleted"));
    if (!outcome.failed.length && !outcome.cancelled) onClear();
  }

  return (
    <>
      <OverlayPortal>
        <div
          className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-3"
          style={{ bottom: "calc(var(--dock-reserve, 6.25rem) + 0.75rem)" }}
        >
          <div
            role="region"
            aria-label="Batch actions"
            data-testid="batch-bar"
            className="mat-surface-strong pointer-events-auto flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-white/12 p-2.5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]"
          >
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full bg-[rgb(var(--accent-rgb)/0.16)] px-2.5 py-1 font-mono text-[12px] font-semibold text-white"
                data-testid="batch-count"
              >
                {count} selected
              </span>

              {running ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-white/60">
                    {progress.done} of {progress.total}
                    {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                    data-testid="batch-cancel"
                    className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] font-semibold text-white/75 active:scale-95"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <BatchBtn
                    icon={StretchHorizontal}
                    label="Place on VYBZ"
                    onClick={() => {
                      onPlace?.(selected);
                      onClear();
                    }}
                    testId="batch-place-on-vybz"
                  />
                  <BatchBtn
                    icon={Sparkles}
                    label="Living Mix"
                    hint={playable.length !== count ? `${playable.length} playable` : undefined}
                    onClick={livingMix}
                    testId="batch-living-mix"
                  />
                  <BatchBtn
                    icon={ListPlus}
                    label="Queue"
                    hint={playable.length !== count ? `${playable.length} playable` : undefined}
                    onClick={queueAll}
                    testId="batch-queue"
                  />
                  <BatchBtn
                    icon={Download}
                    label="Download"
                    hint={downloadable.length !== count ? `${downloadable.length} with files` : undefined}
                    onClick={() => void downloadAll()}
                    testId="batch-download"
                  />
                  <BatchBtn
                    icon={Trash2}
                    label="Delete"
                    danger
                    onClick={() => setPending({ kind: "delete", ids: selectedIds })}
                    testId="batch-delete"
                  />
                  <button
                    type="button"
                    onClick={onClear}
                    aria-label="Clear selection"
                    data-testid="batch-clear"
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 hover:text-white active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {running && (
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-suite-cyan transition-[width] duration-200"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </OverlayPortal>

      {pending?.kind === "delete" && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[96] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={() => setPending(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Confirm batch delete"
              className="mat-surface-strong w-full max-w-sm rounded-t-3xl border-t border-white/12 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:border"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-base font-semibold text-white">
                Delete {pending.ids.length} {pending.ids.length === 1 ? "track" : "tracks"}?
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                They will be removed from your library and from every listener&apos;s feed. Tracks are
                deleted one at a time, and anything that fails will be reported rather than hidden.
              </p>
              <ul className="no-scrollbar mt-3 max-h-32 space-y-0.5 overflow-y-auto">
                {pending.ids.slice(0, 8).map((id) => (
                  <li key={id} className="truncate text-[12px] text-white/45">
                    {byId.get(id)?.title?.trim() || "Untitled"}
                  </li>
                ))}
                {pending.ids.length > 8 && (
                  <li className="text-[12px] text-white/30">and {pending.ids.length - 8} more…</li>
                )}
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="btn btn-ghost flex-1"
                  data-testid="batch-delete-cancel"
                >
                  Keep them
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAll(pending.ids)}
                  data-testid="batch-delete-confirm"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-wild/80 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {pending.ids.length}
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}

function BatchBtn({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  testId,
}: {
  icon: typeof Download;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint ? `${label} — ${hint}` : label}
      data-testid={testId}
      className={cx(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95",
        danger ? "bg-wild/15 text-wild hover:bg-wild/25" : "bg-white/[0.08] text-white/80 hover:text-white"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {hint && <span className="font-mono text-[10px] text-white/40">{hint}</span>}
    </button>
  );
}
