import type { PortableAudioAnalysis } from "@vybz/processing/waveform";
import { analyzeWavBuffer } from "@vybz/processing/waveform";

export type BatchQueueItem = {
  id: string;
  name: string;
  localPath?: string;
  sizeBytes: number;
  status: "queued" | "running" | "succeeded" | "failed";
  error?: string;
  result?: PortableAudioAnalysis;
};

export type BatchQueueState = {
  items: BatchQueueItem[];
};

/** Enqueue a desktop batch item (pure — no Bridge). */
export function enqueueBatchItem(
  state: BatchQueueState,
  item: Omit<BatchQueueItem, "status" | "result" | "error"> & { status?: BatchQueueItem["status"] }
): BatchQueueState {
  return {
    items: [
      ...state.items,
      {
        ...item,
        status: item.status ?? "queued",
      },
    ],
  };
}

/**
 * Run portable analysis for an in-memory WAV buffer (native path uses Bridge).
 * Used for golden round-trip tests and web fallback preview on the desktop panel.
 */
export function runPortableBatchItem(
  item: BatchQueueItem,
  buffer: ArrayBuffer
): BatchQueueItem {
  try {
    const result = analyzeWavBuffer(buffer, {
      bucketCount: 512,
      includeSpectrum: true,
      sizeBytes: item.sizeBytes,
      engine: "portable",
      enforcePortableLimit: true,
    });
    return { ...item, status: "succeeded", result };
  } catch (err) {
    return {
      ...item,
      status: "failed",
      error: err instanceof Error ? err.message : "Analyze failed",
    };
  }
}
