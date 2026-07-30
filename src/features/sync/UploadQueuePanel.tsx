import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { UploadQueueItem } from "@/platform/sync/uploadQueue";
import {
  getUploadQueue,
  retryUploadItem,
  subscribeUploadQueue,
} from "@/platform/sync/uploadQueueController";

/**
 * Mobile upload queue — retry + progress; offline-safe (persists sealed prefs).
 */
export function UploadQueuePanel() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setItems(await getUploadQueue().list());
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeUploadQueue(() => {
      void refresh();
    });
  }, [refresh]);

  async function onDrain() {
    setBusy(true);
    try {
      setItems(await getUploadQueue().drain());
    } finally {
      setBusy(false);
    }
  }

  async function onRetry(id: string) {
    setBusy(true);
    try {
      setItems(await retryUploadItem(id));
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(id: string) {
    await getUploadQueue().cancel(id);
    await refresh();
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-suite border border-white/10 bg-abyss/40 p-4"
      data-testid="upload-queue-panel"
      aria-label="Upload queue"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-snow" data-testid="upload-queue-title">
            Upload queue
          </h2>
          <p className="text-xs text-fog">Offline-safe · retry with progress</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          data-testid="upload-queue-drain"
          disabled={busy}
          onClick={() => void onDrain()}
        >
          Sync now
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-fog" data-testid="upload-queue-empty">
          No pending uploads.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="upload-queue-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-suite-md border border-white/10 bg-void/40 p-3"
              data-testid="upload-queue-item"
              data-status={item.status}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-snow">{item.fileName}</p>
                  <p className="text-[10px] uppercase tracking-wide text-fog">
                    {item.status}
                    {item.error ? ` · ${item.error}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.status === "failed" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      data-testid="upload-queue-retry"
                      disabled={busy}
                      onClick={() => void onRetry(item.id)}
                    >
                      Retry
                    </Button>
                  ) : null}
                  {item.status === "queued" || item.status === "uploading" || item.status === "failed" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid="upload-queue-cancel"
                      onClick={() => void onCancel(item.id)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={Math.round(item.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                data-testid="upload-queue-progress"
              >
                <div
                  className="h-full rounded-full bg-sky-400/80 transition-[width]"
                  style={{ width: `${Math.round(item.progress * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
