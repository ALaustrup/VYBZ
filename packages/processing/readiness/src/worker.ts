/**
 * Readiness worker — portable audio header + artwork dimension probes.
 * Runs in a Web Worker; no network; $0 compute.
 */

import { parseArtistTitle, probeJpeg, probePng, probeWav } from "./fixtures";

export type WorkerProbeRequest =
  | {
      type: "probe-audio";
      requestId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      buffer: ArrayBuffer;
    }
  | {
      type: "probe-artwork";
      requestId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      buffer: ArrayBuffer;
    }
  | {
      /**
       * Measure loudness from already-decoded PCM. The host decodes compressed
       * audio (Web Audio has no worker-side decoder) and transfers channel data
       * here so the sample loops stay off the main thread.
       */
      type: "measure-loudness";
      requestId: string;
      channels: Float32Array[];
      sampleRate: number;
    };

export type MeasuredLoudness = {
  peakDbfs: number;
  rmsDbfs: number;
  /** Legacy gated-RMS estimate — prefer `integratedLufs` when present. */
  integratedLufsApprox: number;
  /** BS.1770-4 integrated loudness (LUFS). */
  integratedLufs?: number;
  momentaryLufs?: number;
  shortTermLufs?: number;
  loudnessRangeLu?: number;
  /** True peak via oversampling (dBTP). */
  truePeakDbtp?: number;
  loudnessProvenance?: {
    standard: "BS.1770-4";
    meterVersion: string;
    sampleRate: number;
    channelCount: number;
    truePeakOversample: number;
    environment: string;
  };
  crestFactorDb?: number;
  stereoCorrelation?: number | null;
  spectralBalance?: {
    lowShare: number;
    midShare: number;
    highShare: number;
  };
  /** Rate the analysis ran at — may differ from the container rate if the host resampled. */
  analysisSampleRate: number;
  channels: number;
  durationSeconds: number;
};

export type WorkerProbeResponse =
  | {
      type: "progress";
      requestId: string;
      stage: "container" | "measuring" | "artwork";
      percent: number;
    }
  | {
      type: "probe-result";
      requestId: string;
      ok: true;
      kind: "audio" | "artwork";
      probe: Record<string, unknown>;
    }
  | {
      type: "probe-result";
      requestId: string;
      ok: false;
      error: string;
    }
  | {
      type: "loudness-result";
      requestId: string;
      ok: true;
      metrics: MeasuredLoudness;
    }
  | {
      type: "loudness-result";
      requestId: string;
      ok: false;
      error: string;
    };

function handle(msg: WorkerProbeRequest): WorkerProbeResponse {
  try {
    if (msg.type === "measure-loudness") {
      return {
        type: "loudness-result",
        requestId: msg.requestId,
        ok: false,
        error: "Loudness measurement is provided by the application worker",
      };
    }

    if (msg.type === "probe-audio") {
      const lower = msg.fileName.toLowerCase();
      const probe =
        lower.endsWith(".wav") || msg.mimeType.includes("wav")
          ? probeWav(msg.buffer, msg.fileName, msg.mimeType, msg.sizeBytes)
          : {
              fileName: msg.fileName,
              mimeType: msg.mimeType,
              sizeBytes: msg.sizeBytes,
              container: lower.split(".").pop(),
              ...parseArtistTitle(msg.fileName),
            };
      return { type: "probe-result", requestId: msg.requestId, ok: true, kind: "audio", probe };
    }

    const dims =
      msg.fileName.toLowerCase().endsWith(".png") || msg.mimeType.includes("png")
        ? probePng(msg.buffer)
        : probeJpeg(msg.buffer);
    return {
      type: "probe-result",
      requestId: msg.requestId,
      ok: true,
      kind: "artwork",
      probe: {
        fileName: msg.fileName,
        mimeType: msg.mimeType,
        sizeBytes: msg.sizeBytes,
        ...dims,
      },
    };
  } catch (err) {
    return {
      type: "probe-result",
      requestId: msg.requestId,
      ok: false,
      error: err instanceof Error ? err.message : "Probe failed",
    };
  }
}

const scope = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<WorkerProbeRequest>) => void) | null;
  postMessage: (msg: WorkerProbeResponse) => void;
};

scope.onmessage = (ev) => {
  scope.postMessage(handle(ev.data));
};
