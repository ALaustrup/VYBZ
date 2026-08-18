import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { overlayVariants, sheetVariants, springSoft, withReduce } from "@/lib/motion";
import { useReduceFx } from "@/lib/display";
import {
  AudioLines, CheckCircle2, Globe, Loader2, Lock, RotateCw, Send, Trash2, Users, X,
} from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { OriginalityClaim } from "@/components/OriginalityClaim";
import { Waveform } from "@/components/Waveform";
import { AUDIO_ACCEPT, acousticSignature, qualityLabel } from "@/lib/waveform";
import { MUSICAL_KEYS } from "@/lib/profileFields";
import {
  buildDropInput, canReleaseItem, clearReleasedUploads, editUploadMeta, enqueueUploads,
  getUploadQueue,
  itemStatusLabel, markUploadFailed, markUploadReleased, removeUploadItem, retryUpload,
  summarizeQueue, useUploadQueue, type UploadItem,
} from "@/features/upload/uploadQueue";
import { filesFromDataTransfer } from "@/features/upload/dataTransferFiles";
import { cx, paletteFor } from "@/lib/utils";
import type { PostAudience, ReleaseType } from "@/types";

const RELEASE_TYPES: { id: ReleaseType; label: string }[] = [
  { id: "original", label: "Original" }, { id: "remix", label: "Remix" }, { id: "cover", label: "Cover" },
  { id: "edit", label: "Edit" }, { id: "mashup", label: "Mashup" }, { id: "live", label: "Live" },
  { id: "instrumental", label: "Instrumental" }, { id: "bootleg", label: "Bootleg" },
];

function prettyBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

/**
 * One file in the batch. Its bytes are already moving by the time this renders,
 * so every field here is editable while the upload runs.
 */
function UploadRow({ item, disabled }: { item: UploadItem; disabled: boolean }) {
  const accent = paletteFor(item.seed)[0];
  const released = item.status === "released";
  const failed = item.status === "failed";
  const sending = item.status === "reading" || item.status === "uploading";
  const auto = item.autoFilled.length
    ? item.autoFilled
        .map((f) => (f === "creditedArtist" ? "artist" : f === "musicalKey" ? "key" : f))
        .join(", ")
    : null;

  return (
    <li
      data-testid="upload-row"
      className={cx(
        "rounded-2xl border p-3 transition",
        failed ? "border-wild/40 bg-wild/[0.06]" : "border-[var(--hairline)] bg-white/[0.03]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white/85">{item.name}</p>
          <p
            className={cx(
              "mt-0.5 flex items-center gap-1.5 text-[11px]",
              failed ? "text-wild" : released ? "text-veil-200" : "text-white/45",
            )}
          >
            {sending && <Loader2 className="h-3 w-3 animate-spin" />}
            {released && <CheckCircle2 className="h-3 w-3" />}
            {itemStatusLabel(item)}
          </p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-white/35">
          {prettyBytes(item.file.size)}
        </span>
        {failed ? (
          <button
            type="button"
            onClick={() => retryUpload(item.id)}
            aria-label={`Retry ${item.name}`}
            className="forge-card-icon flex h-8 w-8 shrink-0 items-center justify-center text-white/60 transition active:scale-95 hover:text-white"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => removeUploadItem(item.id)}
          aria-label={`Remove ${item.name}`}
          className="forge-card-icon flex h-8 w-8 shrink-0 items-center justify-center text-white/55 transition active:scale-95 hover:text-wild"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bytes-sent, which is not the same as accepted — the label says which. */}
      {sending && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-veil-400 transition-all"
            style={{ width: `${item.percent}%` }}
          />
        </div>
      )}

      {!released && (
        <>
          <div className="mt-2.5">
            <Waveform peaks={item.meta.peaks} progress={0} accent={accent} height={28} />
          </div>

          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <div className="forge-field !py-2 sm:col-span-2">
              <input
                value={item.meta.title}
                onChange={(e) => editUploadMeta(item.id, "title", e.target.value.slice(0, 80))}
                placeholder="Song title…"
                aria-label={`Title for ${item.name}`}
                disabled={disabled}
              />
            </div>
            <div className="forge-field !py-2">
              <input
                value={item.meta.creditedArtist}
                onChange={(e) => editUploadMeta(item.id, "creditedArtist", e.target.value.slice(0, 80))}
                placeholder="Artist"
                aria-label={`Artist for ${item.name}`}
                disabled={disabled}
              />
            </div>
            <div className="forge-field !py-2">
              <input
                value={item.meta.album}
                onChange={(e) => editUploadMeta(item.id, "album", e.target.value.slice(0, 80))}
                placeholder="Album — blank for Single"
                aria-label={`Album for ${item.name}`}
                disabled={disabled}
              />
            </div>
            <div className="forge-field !py-2">
              <input
                type="number"
                inputMode="numeric"
                value={item.meta.bpm}
                onChange={(e) =>
                  editUploadMeta(item.id, "bpm", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
                }
                placeholder="BPM"
                aria-label={`BPM for ${item.name}`}
                disabled={disabled}
              />
            </div>
            <div className="forge-field !py-2">
              <select
                value={item.meta.musicalKey}
                onChange={(e) => editUploadMeta(item.id, "musicalKey", e.target.value)}
                aria-label={`Key for ${item.name}`}
                disabled={disabled}
                className="w-full bg-transparent text-sm text-white/85 outline-none"
              >
                <option value="">Key</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k} className="bg-ink-900">
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-1.5 text-[11px] text-white/35">
            {qualityLabel(item.meta.format, item.meta.sampleRate, item.meta.lossless) || "Audio"}
            {auto ? <span className="text-veil-200"> · from file: {auto}</span> : null}
          </p>
        </>
      )}
    </li>
  );
}

export function ComposeSheet({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const { showToast, celebrate } = useSession();
  const navigate = useNavigate();
  const reduce = useReduceFx();
  const items = useUploadQueue();
  const [releaseType, setReleaseType] = useState<ReleaseType>("original");
  const [audience, setAudience] = useState<PostAudience>("public");
  const [ownershipClaim, setOwnershipClaim] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const summary = summarizeQueue(items);
  const releasable = items.filter(canReleaseItem);

  const add = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const { ids, skippedNonAudio, skippedEmpty, skippedOversize } = enqueueUploads(list);
      const skipped = skippedNonAudio + skippedEmpty + skippedOversize;
      if (skipped > 0 && !ids.length) {
        showToast(
          skippedOversize > 0 ? "That file is over the 1 GB limit." : "Choose audio or video files.",
        );
      } else if (skipped > 0) {
        showToast(`Added ${ids.length} · skipped ${skipped}`);
      }
    },
    [showToast],
  );

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    add(e.target.files);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    // Called synchronously: the item list is emptied once this handler yields.
    void filesFromDataTransfer(e.dataTransfer).then((files) => {
      if (files.length) add(files);
      else showToast("Nothing to upload in that drop.");
    });
  }

  useEffect(() => {
    if (open) setOwnershipClaim(false);
  }, [open]);

  async function releaseAll() {
    if (!releasable.length || releasing) return;
    if (!ownershipClaim) {
      showToast("Tick the box — this has to be your music.");
      return;
    }
    setReleasing(true);
    let ok = 0;
    try {
      for (const item of releasable) {
        const fingerprint = await acousticSignature(item.meta.peaks).catch(() => undefined);
        const drop = await api.createDrop(
          buildDropInput(item, { audience, releaseType, fingerprint }),
        );
        if (drop) {
          markUploadReleased(item.id, drop.id);
          ok++;
        } else {
          markUploadFailed(item.id, "Couldn't create the drop. Retry.");
        }
      }
    } finally {
      setReleasing(false);
    }
    if (ok > 0) {
      celebrate(
        audience === "private"
          ? `${ok} private ${ok === 1 ? "drop" : "drops"} saved`
          : `${ok} ${ok === 1 ? "drop is" : "drops are"} live`,
      );
      onPosted();
      clearReleasedUploads();
      // An empty sheet is just in the way. Anything that failed, or is still
      // uploading, is a reason to stay open — nothing left is a reason to go.
      if (getUploadQueue().length === 0) onClose();
      if (audience === "public") navigate("/feed");
    }
  }

  function close() {
    clearReleasedUploads();
    onClose();
  }

  const busyLabel = summary.inFlight > 0
    ? `${summary.inFlight} still uploading · ${summary.percent}%`
    : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, { duration: 0.22 })}
            onClick={close}
            className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, springSoft)}
            className="fixed inset-x-0 bottom-0 z-[85] mx-auto flex max-h-[min(94dvh,100dvh)] w-full max-w-2xl flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl"
            data-dark-stage
            data-testid="compose-sheet"
          >
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                  {items.length > 1 ? `${items.length} files` : "New file"}
                </h2>
                <p className="text-[12px] text-white/40">
                  {busyLabel ?? "Drop files. They upload while you name them."}
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={AUDIO_ACCEPT}
                onChange={handleFile}
                className="hidden"
                data-testid="compose-file-input"
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cx(
                  "mb-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed py-6 transition",
                  dragging
                    ? "border-veil-400/60 bg-veil-500/10"
                    : "border-white/15 bg-white/[0.02] hover:border-white/25",
                )}
              >
                <AudioLines className="h-6 w-6 text-white/30" />
                <span className="text-[13px] font-medium text-white/70">
                  {items.length ? "Add more" : "Drop audio here"}
                </span>
                <span className="text-[11px] text-white/35">Upload starts now</span>
              </button>

              {items.length > 0 && (
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <UploadRow key={item.id} item={item} disabled={releasing} />
                  ))}
                </ul>
              )}

              {items.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-white/60">
                      Type (all files)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {RELEASE_TYPES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setReleaseType(r.id)}
                          className={cx("forge-chip", releaseType === r.id ? "forge-chip--active" : "")}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-white/60">
                      Who can hear it
                    </p>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setAudience("public")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "public" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Globe className="h-3.5 w-3.5" /> Public</button>
                      <button type="button" onClick={() => setAudience("followers")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "followers" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Users className="h-3.5 w-3.5" /> Network</button>
                      <button type="button" onClick={() => setAudience("private")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "private" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Lock className="h-3.5 w-3.5" /> Private</button>
                    </div>
                  </div>

                  <div>
                    <p className="nexus-eyebrow mb-2">Originality</p>
                    <OriginalityClaim checked={ownershipClaim} onChange={setOwnershipClaim} />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--hairline)] bg-ink-900/95 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
              {summary.failed > 0 && (
                <p className="mb-2 text-[11px] text-wild">
                  {summary.failed} failed. Retry that row.
                </p>
              )}
              <button
                type="button"
                onClick={() => void releaseAll()}
                disabled={!releasable.length || releasing || !ownershipClaim}
                data-testid="compose-release"
                className="btn btn-primary w-full py-3.5 disabled:opacity-50"
              >
                {releasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {releasable.length > 1 ? `Save ${releasable.length} files` : "Save file"}
                  </>
                )}
              </button>
              {summary.inFlight > 0 && (
                <p className="mt-2 text-center text-[11px] text-white/35">
                  Upload keeps going if you close this.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
