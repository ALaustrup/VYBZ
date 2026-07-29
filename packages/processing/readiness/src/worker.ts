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
    };

export type WorkerProbeResponse =
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
    };

function handle(msg: WorkerProbeRequest): WorkerProbeResponse {
  try {
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
