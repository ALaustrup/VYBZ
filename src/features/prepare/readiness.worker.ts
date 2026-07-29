/**
 * Vite Web Worker entry — probes only; no network.
 * Lives under src/ so `?worker` resolves reliably (package alias + ?worker breaks Vite).
 */
import { probeFixtures } from "@vybz/processing/readiness";
import type { WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";

const { parseArtistTitle, probeWav, probePng, probeJpeg } = probeFixtures;

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
