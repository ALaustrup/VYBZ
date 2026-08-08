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

type Progress = {
  total: number;
  done: number;
  failed: number;
  current?: string;
};

/**
 * Signed-in shell host: drop audio files anywhere to enqueue private library uploads.
 * Background sequential ingest — no batch-size cap. Originality assumed (same as Bulk claim).
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
  const queueRef = useRef<File[]>([]);
  const runningRef = useRef(false);
  const dragDepth = useRef(0);

  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    let ok = 0;
    let fail = 0;
    const totalAtStart = queueRef.current.length;
    setProgress({ total: totalAtStart, done: 0, failed: 0 });

    while (queueRef.current.length > 0) {
      const file = queueRef.current.shift()!;
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
        if (!path) throw new Error("upload");
        const [sha256, fingerprint] = await Promise.all([
          sha256Hex(file).catch(() => undefined),
          acousticSignature(peaks).catch(() => undefined),
        ]);
        const drop = await api.createDrop({
          title: (tags.title || titleFromFilename(file.name)).slice(0, 80) || undefined,
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
        if (!drop) throw new Error("create");
        ok++;
      } catch {
        fail++;
      }
      setProgress({
        total: ok + fail + queueRef.current.length,
        done: ok + fail,
        failed: fail,
        current: queueRef.current[0]?.name,
      });
    }

    runningRef.current = false;
    setProgress(null);
    if (ok > 0) {
      showToast(
        fail === 0
          ? ok === 1
            ? "Added 1 track to your library"
            : `Added ${ok} tracks to your library`
          : `Added ${ok} · ${fail} failed`
      );
      onIngested?.();
    } else if (fail > 0) {
      showToast("Couldn't add dropped files to your library");
    }
  }, [onIngested, showToast]);

  const enqueue = useCallback(
    (list: FileList | File[]) => {
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
            ? "Adding to library (private)…"
            : `Adding ${files.length} tracks to library (private)…`
        );
      }
      queueRef.current.push(...files);
      void pump();
    },
    [progress, pump, showToast]
  );

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
      if (target?.closest("input, textarea, [contenteditable='true'], [data-no-library-drop]")) {
        return;
      }
      if (e.dataTransfer?.files?.length) enqueue(e.dataTransfer.files);
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
        >
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-veil-300/50 bg-ink-900/90 px-10 py-8">
            <Upload className="h-8 w-8 text-veil-300" />
            <p className="font-display text-lg text-white">Drop to add to library</p>
            <p className="text-[12px] text-white/45">Private tracks · no batch limit</p>
          </div>
        </div>
      )}
      {progress && (
        <div
          className={cx(
            "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 z-[88] w-[min(22rem,calc(100%-2rem))] -translate-x-1/2",
            "rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-card backdrop-blur-xl"
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
