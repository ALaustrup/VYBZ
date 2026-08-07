import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { StateView } from "@/components/states/StateView";
import { usePlatform } from "@/platform/bridge/PlatformProvider";
import {
  enqueueBatchItem,
  runPortableBatchItem,
  type BatchQueueItem,
} from "@/features/processing/desktopBatchQueue";
import { invokeAnalyzeAudio } from "@/platform/bridge/tauriInvoke";
import { PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";

/**
 * Desktop-only batch loudness / waveform queue.
 * On web shells, shows a read-only placeholder (Phase 5 constraint).
 */
export function DesktopBatchPanel() {
  const bridge = usePlatform();
  const isDesktop = bridge.kind === "desktop";
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchQueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = useCallback(async () => {
    setError(null);
    try {
      const files = await bridge.files.selectAudio();
      let next = { items };
      for (const f of files) {
        next = enqueueBatchItem(next, {
          id: f.id || crypto.randomUUID(),
          name: f.name,
          localPath: f.localPath,
          sizeBytes: f.sizeBytes,
        });
      }
      setItems(next.items);

      // Auto-run native when localPath present; else wait for WAV file input analyze.
      const resolved: BatchQueueItem[] = [];
      for (const item of next.items) {
        if (item.status !== "queued") {
          resolved.push(item);
          continue;
        }
        if (item.localPath) {
          const native = await invokeAnalyzeAudio(item.localPath, 2048);
          if (native) {
            resolved.push({ ...item, status: "succeeded", result: native });
            continue;
          }
        }
        resolved.push(item);
      }
      setItems(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pick audio");
    }
  }, [bridge, items]);

  async function onFileInput(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      const nextItems: BatchQueueItem[] = [...items];
      for (const file of Array.from(fileList)) {
        let row: BatchQueueItem = {
          id: crypto.randomUUID(),
          name: file.name,
          sizeBytes: file.size,
          status: "running",
        };
        if (file.size <= PORTABLE_FFT_MAX_BYTES) {
          row = runPortableBatchItem(row, await file.arrayBuffer());
        } else {
          row = {
            ...row,
            status: "failed",
            error: `Portable FFT limited to ${PORTABLE_FFT_MAX_BYTES} bytes — use Desktop native path for larger masters`,
          };
        }
        nextItems.push(row);
      }
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isDesktop) {
    return (
      <div className="mx-auto max-w-2xl p-4 pb-28 md:p-8" data-testid="desktop-batch-placeholder">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-suite-cyan">Desktop</p>
        <h1 className="font-display text-2xl font-semibold text-snow">Batch processing</h1>
        <p className="mt-2 text-sm text-fog">
          Batch loudness and high-res waveform queue runs in VYBZ Desktop. Open this page in the
          Windows shell, or continue with single-file Prepare on the web.
        </p>
        <Link to="/releases" className="mt-4 inline-block text-sm text-suite-cyan hover:underline">
          ← Releases
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8" data-testid="desktop-batch-panel">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-suite-cyan">Desktop Engine</p>
        <h1 className="font-display text-2xl font-semibold text-snow">Batch loudness & waveform</h1>
        <p className="mt-1 text-sm text-fog">
          Queue local masters for native peaks + loudness. Portable FFT covers files ≤10 MB.
        </p>
      </div>

      {error ? <StateView variant="error" title="Batch error" body={error} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void onPick()} data-testid="desktop-batch-pick">
          Add from picker
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/wav,.wav"
          multiple
          className="hidden"
          data-testid="desktop-batch-file"
          onChange={(e) => void onFileInput(e.target.files)}
        />
        <Button type="button" loading={busy} variant="secondary" onClick={() => fileRef.current?.click()} data-testid="desktop-batch-add-wav">
          Add WAV files
        </Button>
      </div>

      {items.length === 0 ? (
        <StateView variant="empty" title="Queue empty" body="Add WAV masters to analyze loudness and waveform peaks." />
      ) : (
        <ul className="flex flex-col gap-2" data-testid="desktop-batch-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-suite border border-white/10 bg-white/[0.03] px-4 py-3"
              data-testid={`desktop-batch-row-${item.id}`}
            >
              <p className="font-medium text-snow">{item.name}</p>
              <p className="text-xs text-fog">
                {item.status}
                {item.result
                  ? item.result.integratedLufs != null
                    ? ` · peak ${item.result.peakDbfs.toFixed(1)} dBFS · ${item.result.integratedLufs.toFixed(1)} LUFS (BS.1770-4)${
                        item.result.truePeakDbtp != null
                          ? ` · TP ${item.result.truePeakDbtp.toFixed(1)} dBTP`
                          : ""
                      } · ${item.result.engine}`
                    : ` · peak ${item.result.peakDbfs.toFixed(1)} dBFS · ~${item.result.integratedLufsApprox.toFixed(1)} LUFS (estimated — native BS.1770 pending) · ${item.result.engine}`
                  : ""}
                {item.error ? ` · ${item.error}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
