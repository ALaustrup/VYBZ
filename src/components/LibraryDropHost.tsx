import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import * as api from "@/lib/api";
import { collectLibraryAudioFiles, dragHasFiles } from "@/lib/libraryDropIngest";
import {
  audioMeta,
  computeWaveform,
  placeholderWaveform,
  sha256Hex,
  acousticSignature,
} from "@/lib/waveform";
import { readId3Tags, titleFromFilename } from "@/lib/id3Tags";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import { takeLandingDropFiles } from "@/features/workspace/landingDropStash";
import { seedWorkingTrackFromFile } from "@/features/workspace/seedWorkingTrackFromFile";
import type { WorkingTrackSource } from "@/features/workspace/workingSet";

type Progress = {
  total: number;
  done: number;
  failed: number;
  current?: string;
};

type Queued = { file: File; focusSource: WorkingTrackSource };

/**
 * OR-040 — signed-in shell host: drop audio anywhere → private Library + focus song workspace.
 * Guest Landing drops are drained from in-memory stash after sign-in (no unsigned upload).
 */
export function LibraryDropHost({
  enabled,
  onIngested,
}: {
  enabled: boolean;
  onIngested?: () => void;
}) {
  const { showToast } = useSession();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const queueRef = useRef<Queued[]>([]);
  const runningRef = useRef(false);
  const dragDepth = useRef(0);
  const focusedThisBatch = useRef(false);

  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    focusedThisBatch.current = false;
    let ok = 0;
    let fail = 0;
    let lastFailReason: string | null = null;
    const totalAtStart = queueRef.current.length;
    setProgress({ total: totalAtStart, done: 0, failed: 0 });

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift()!;
      const file = item.file;
      const remaining = queueRef.current.length;
      const total = ok + fail + remaining + 1;
      setProgress({
        total,
        done: ok + fail,
        failed: fail,
        current: file.name,
      });
      try {
        const ext = (file.name.split(".").pop() || "audio").toLowerCase();
        const meta = audioMeta(file);
        const [tags, wf] = await Promise.all([
          readId3Tags(file),
          computeWaveform(file, 200, false).catch(() => null),
        ]);
        if (tags.artworkUrl) URL.revokeObjectURL(tags.artworkUrl);
        const peaks = wf?.peaks ?? placeholderWaveform(Math.floor(Math.random() * 1e6), 200);
        const path = await api.uploadAudio(file, ext);
        if (!path) throw new Error("Storage upload failed — check sign-in and audio-assets access");
        const [sha256, fingerprint] = await Promise.all([
          sha256Hex(file).catch(() => undefined),
          acousticSignature(peaks).catch(() => undefined),
        ]);
        const title = (tags.title || titleFromFilename(file.name)).slice(0, 80) || undefined;
        const drop = await api.createDrop({
          title,
          seed: Math.floor(Math.random() * 1e6),
          assetKind: "track",
          audioUrl: path,
          waveform: peaks,
          durationSec: wf?.duration ?? 0,
          bpm: tags.bpm ?? wf?.bpm ?? undefined,
          musicalKey: wf?.key || undefined,
          audioFormat: meta.format,
          sampleRate: wf?.sampleRate || undefined,
          lossless: meta.lossless,
          license: "collab-only",
          sha256,
          fingerprint,
          fx: "glow",
          audience: "private",
          creditedArtist: tags.artist?.slice(0, 80) || undefined,
        });
        if (!drop) throw new Error("Library record create failed");
        if (!focusedThisBatch.current) {
          seedWorkingTrackFromFile({
            file,
            source: item.focusSource,
            dropId: drop.id,
            title: title ?? null,
            artistName: tags.artist ?? null,
          });
          focusedThisBatch.current = true;
        }
        ok++;
      } catch (err) {
        fail++;
        lastFailReason = err instanceof Error ? err.message : "Unknown upload error";
      }
      setProgress({
        total: ok + fail + queueRef.current.length,
        done: ok + fail,
        failed: fail,
        current: queueRef.current[0]?.file.name,
      });
    }

    runningRef.current = false;
    setProgress(null);
    if (ok > 0) {
      showToast(
        fail === 0
          ? ok === 1
            ? "Added to library · opened in song workspace"
            : `Added ${ok} to library · first track opened in song workspace`
          : `Added ${ok} · ${fail} failed · workspace focused when upload succeeded`,
      );
      onIngested?.();
    } else if (fail > 0) {
      showToast(
        lastFailReason
          ? `Couldn't add to library — ${lastFailReason}`
          : "Couldn't add dropped files to your library",
      );
    }
  }, [onIngested, showToast]);

  const enqueue = useCallback(
    (list: FileList | File[], focusSource: WorkingTrackSource = "library") => {
      const { files, skippedNonAudio, skippedOversize } = collectLibraryAudioFiles(list);
      if (skippedOversize > 0) {
        showToast(`${skippedOversize} file${skippedOversize === 1 ? "" : "s"} over 1 GB — skipped`);
      }
      if (!files.length) {
        if (skippedNonAudio > 0) showToast("Drop audio files (WAV, FLAC, MP3, …)");
        return;
      }
      if (!progress && !runningRef.current) {
        showToast(
          files.length === 1
            ? "Adding to library · focusing song workspace…"
            : `Adding ${files.length} tracks · focusing first in song workspace…`,
        );
      }
      queueRef.current.push(...files.map((file) => ({ file, focusSource })));
      void pump();
    },
    [progress, pump, showToast],
  );

  // Drain guest Landing stash once the signed-in shell is ready (OR-040).
  useEffect(() => {
    if (!enabled) return;
    const pending = takeLandingDropFiles();
    if (!pending.length) return;
    enqueue(pending, "landing");
  }, [enabled, enqueue]);

  useEffect(() => {
    if (!enabled) return;

    const onDragEnter = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const target = e.target as HTMLElement | null;
      // Desk-owned dropzones (Analyzer, Forge tools) must win over library ingest.
      if (target?.closest("input, textarea, [contenteditable='true'], [data-no-library-drop]")) {
        return;
      }
      if (e.dataTransfer?.files?.length) enqueue(e.dataTransfer.files, "library");
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [enabled, enqueue]);

  if (!enabled) return null;

  return (
    <>
      {dragging && (
        <div
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm"
          aria-hidden
          data-testid="library-drop-overlay"
        >
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-veil-300/50 bg-ink-900/90 px-10 py-8">
            <Upload className="h-8 w-8 text-veil-300" />
            <p className="font-display text-lg text-white">Drop to open song workspace</p>
            <p className="text-[12px] text-white/45">Adds to Library (private) · focuses first track</p>
          </div>
        </div>
      )}
      {progress && (
        <div
          className={cx(
            "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 z-[88] w-[min(22rem,calc(100%-2rem))] -translate-x-1/2",
            "rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-card backdrop-blur-xl",
          )}
          role="status"
          aria-live="polite"
          data-testid="library-drop-progress"
        >
          <div className="flex items-center gap-2 text-sm text-white/85">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-veil-300" />
            <span className="min-w-0 truncate">
              Library · {progress.done}/{progress.total}
              {progress.current ? ` · ${progress.current}` : ""}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
