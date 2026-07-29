/**
 * Portable processing worker — FFT / peaks / loudness for ≤10 MB WAV.
 * Vite entry lives under src/ (package + ?worker is fragile).
 */
import { analyzeWavBuffer, PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";

export type ProcessingWorkerRequest = {
  type: "analyze-wav";
  requestId: string;
  fileName: string;
  sizeBytes: number;
  buffer: ArrayBuffer;
  bucketCount?: number;
};

export type ProcessingWorkerResponse =
  | {
      type: "analyze-result";
      requestId: string;
      ok: true;
      result: Record<string, unknown>;
    }
  | {
      type: "analyze-result";
      requestId: string;
      ok: false;
      error: string;
    };

self.onmessage = (ev: MessageEvent<ProcessingWorkerRequest>) => {
  const msg = ev.data;
  const reply = (payload: ProcessingWorkerResponse) => {
    self.postMessage(payload);
  };
  try {
    if (msg.type !== "analyze-wav") {
      reply({
        type: "analyze-result",
        requestId: msg.requestId,
        ok: false,
        error: "Unknown request",
      });
      return;
    }
    if (msg.sizeBytes > PORTABLE_FFT_MAX_BYTES) {
      throw new Error(`Portable FFT limited to ${PORTABLE_FFT_MAX_BYTES} bytes`);
    }
    const result = analyzeWavBuffer(msg.buffer, {
      bucketCount: msg.bucketCount ?? 800,
      includeSpectrum: true,
      sizeBytes: msg.sizeBytes,
      engine: "portable",
    });
    reply({
      type: "analyze-result",
      requestId: msg.requestId,
      ok: true,
      result: result as unknown as Record<string, unknown>,
    });
  } catch (err) {
    reply({
      type: "analyze-result",
      requestId: msg.requestId,
      ok: false,
      error: err instanceof Error ? err.message : "Analyze failed",
    });
  }
};
