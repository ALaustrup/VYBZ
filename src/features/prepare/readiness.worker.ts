/**
 * Vite Web Worker entry — container probes plus loudness maths on decoded PCM.
 * Lives under src/ so `?worker` resolves reliably (package alias + ?worker breaks Vite).
 */
import { probeContainer, probeFixtures } from "@vybz/processing/readiness";
import {
  analyzeWavBuffer,
  computeLoudness,
  measureBs1770,
  PORTABLE_FFT_MAX_BYTES,
} from "@vybz/processing/waveform";
import type { WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";

const { parseArtistTitle, probeWav, probePng, probeJpeg } = probeFixtures;

/** Average channels into a single Float32Array — for legacy RMS / approx only. */
function downmix(channels: Float32Array[]): Float32Array {
  const first = channels[0];
  if (!first) return new Float32Array(0);
  if (channels.length === 1) return first;
  const mono = new Float32Array(first.length);
  for (let i = 0; i < first.length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels.length; ch++) sum += channels[ch]![i] ?? 0;
    mono[i] = sum / channels.length;
  }
  return mono;
}

function handle(msg: WorkerProbeRequest): WorkerProbeResponse {
  try {
    if (msg.type === "measure-loudness") {
      const samples = downmix(msg.channels);
      if (samples.length === 0 || msg.sampleRate <= 0) {
        return {
          type: "loudness-result",
          requestId: msg.requestId,
          ok: false,
          error: "Decoded stream contained no samples",
        };
      }
      const durationSeconds = samples.length / msg.sampleRate;
      const approx = computeLoudness({
        samples,
        sampleRate: msg.sampleRate,
        channels: msg.channels.length,
        durationSeconds,
      });
      // Preserve planar channels — BS.1770 channel weights require stereo/surround layout.
      const bs = measureBs1770(msg.channels, msg.sampleRate, "web-worker");
      return {
        type: "loudness-result",
        requestId: msg.requestId,
        ok: true,
        metrics: {
          peakDbfs: bs.samplePeakDbfs,
          rmsDbfs: approx.rmsDbfs,
          integratedLufsApprox: approx.integratedLufsApprox,
          integratedLufs: bs.integratedLufs,
          momentaryLufs: bs.momentaryLufs,
          shortTermLufs: bs.shortTermLufs,
          loudnessRangeLu: bs.loudnessRangeLu,
          truePeakDbtp: bs.truePeakDbtp,
          loudnessProvenance: bs.provenance,
          analysisSampleRate: msg.sampleRate,
          channels: msg.channels.length,
          durationSeconds,
        },
      };
    }

    if (msg.type === "probe-audio") {
      const lower = msg.fileName.toLowerCase();
      const isWav = lower.endsWith(".wav") || msg.mimeType.includes("wav");
      const container = isWav
        ? null
        : probeContainer(msg.buffer, msg.fileName, msg.mimeType, msg.sizeBytes);

      const probe: Record<string, unknown> = isWav
        ? probeWav(msg.buffer, msg.fileName, msg.mimeType, msg.sizeBytes)
        : {
            fileName: msg.fileName,
            mimeType: msg.mimeType,
            sizeBytes: msg.sizeBytes,
            container: lower.split(".").pop(),
            ...parseArtistTitle(msg.fileName),
            ...(container ?? {}),
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
            integratedLufs: analysis.integratedLufs,
            momentaryLufs: analysis.momentaryLufs,
            shortTermLufs: analysis.shortTermLufs,
            loudnessRangeLu: analysis.loudnessRangeLu,
            truePeakDbtp: analysis.truePeakDbtp,
            loudnessProvenance: analysis.loudnessProvenance,
            loudnessMeasured: true,
            loudnessMethod: "pcm-wav",
            loudnessSampleRate: analysis.sampleRate,
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
    const error = err instanceof Error ? err.message : "Probe failed";
    if (msg.type === "measure-loudness") {
      return { type: "loudness-result", requestId: msg.requestId, ok: false, error };
    }
    return { type: "probe-result", requestId: msg.requestId, ok: false, error };
  }
}

const scope = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<WorkerProbeRequest>) => void) | null;
  postMessage: (msg: WorkerProbeResponse) => void;
};

scope.onmessage = (ev) => {
  scope.postMessage(handle(ev.data));
};
