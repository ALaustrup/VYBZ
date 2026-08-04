/**
 * Vite Web Worker entry — probes only; no network.
 * Lives under src/ so `?worker` resolves reliably (package alias + ?worker breaks Vite).
 */
import { probeFixtures } from "@vybz/processing/readiness";
import { analyzeWavBuffer, PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";
import type { WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";

const { parseArtistTitle, probeWav, probePng, probeJpeg } = probeFixtures;

function handle(msg: WorkerProbeRequest): WorkerProbeResponse {
  try {
    if (msg.type === "probe-audio") {
      const lower = msg.fileName.toLowerCase();
      const isWav = lower.endsWith(".wav") || msg.mimeType.includes("wav");
      const probe = isWav
        ? probeWav(msg.buffer, msg.fileName, msg.mimeType, msg.sizeBytes)
        : {
            fileName: msg.fileName,
            mimeType: msg.mimeType,
            sizeBytes: msg.sizeBytes,
            container: lower.split(".").pop(),
            ...parseArtistTitle(msg.fileName),
          };

      if (isWav && msg.sizeBytes <= PORTABLE_FFT_MAX_BYTES) {
        try {
          const analysis = analyzeWavBuffer(msg.buffer, {
            sizeBytes: msg.sizeBytes,
            includeSpectrum: false,
            enforcePortableLimit: true,
          });
          Object.assign(probe, {
            peakDbfs: analysis.peakDbfs,
            rmsDbfs: analysis.rmsDbfs,
            integratedLufsApprox: analysis.integratedLufsApprox,
            loudnessMeasured: true,
            durationSeconds: analysis.durationSeconds,
            sampleRate: analysis.sampleRate,
            channels: analysis.channels,
          });
        } catch {
          /* PCM decode failed — keep header-only probe, no fabricated loudness */
        }
      }

      return { type: "probe-result", requestId: msg.requestId, ok: true, kind: "audio", probe };
    }

    const lower = msg.fileName.toLowerCase();
    const isPng = lower.endsWith(".png") || msg.mimeType.includes("png");
    const isJpeg =
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      msg.mimeType.includes("jpeg") ||
      msg.mimeType.includes("jpg");
    const dims = isPng
      ? probePng(msg.buffer)
      : isJpeg
        ? probeJpeg(msg.buffer)
        : { format: lower.split(".").pop() ?? "image" };
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
