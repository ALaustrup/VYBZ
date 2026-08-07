import type { AudioProbe, ArtworkProbe } from "@vybz/domain/releases";
import type { MeasuredLoudness, WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";
import { decodeAudioChannels } from "@/features/prepare/audioDecode";
import ReadinessWorker from "./readiness.worker?worker";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) worker = new ReadinessWorker();
  return worker;
}

function send(request: WorkerProbeRequest, transfer: Transferable[]): Promise<WorkerProbeResponse> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent<WorkerProbeResponse>) => {
      if (ev.data.requestId !== request.requestId) return;
      w.removeEventListener("message", onMessage);
      resolve(ev.data);
    };
    const onError = (ev: ErrorEvent) => {
      w.removeEventListener("error", onError);
      reject(new Error(ev.message || "Readiness worker failed"));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError, { once: true });
    w.postMessage(request, transfer);
  });
}

async function runProbe(
  request: Extract<WorkerProbeRequest, { type: "probe-audio" | "probe-artwork" }>
): Promise<Record<string, unknown>> {
  const res = await send(request, [request.buffer]);
  if (res.type !== "probe-result") throw new Error("Unexpected worker response");
  if (!res.ok) throw new Error(res.error);
  return res.probe;
}

/**
 * Measure loudness from decoded PCM. Resolves `null` whenever decode or
 * measurement is unavailable so the caller reports "Not measured".
 */
async function measureLoudness(
  file: { arrayBuffer: () => Promise<ArrayBuffer> },
  nativeSampleRate?: number
): Promise<(MeasuredLoudness & { resampled: boolean }) | null> {
  let decoded: Awaited<ReturnType<typeof decodeAudioChannels>> = null;
  try {
    const buffer = await file.arrayBuffer();
    decoded = await decodeAudioChannels(buffer, { nativeSampleRate });
  } catch {
    return null;
  }
  if (!decoded) return null;

  try {
    const res = await send(
      {
        type: "measure-loudness",
        requestId: crypto.randomUUID(),
        channels: decoded.channels,
        sampleRate: decoded.sampleRate,
      },
      decoded.channels.map((c) => c.buffer)
    );
    if (res.type !== "loudness-result" || !res.ok) return null;
    return { ...res.metrics, resampled: decoded.resampled };
  } catch {
    return null;
  }
}

export async function probeAudioFile(file: {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<AudioProbe> {
  const buffer = await file.arrayBuffer();
  const probe = (await runProbe({
    type: "probe-audio",
    requestId: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    buffer,
  })) as unknown as AudioProbe;

  // WAV already measured in-worker from PCM. Everything else needs a host decode.
  if (probe.loudnessMeasured) return probe;

  const measured = await measureLoudness(file, probe.sampleRate);
  if (!measured) return probe;

  return {
    ...probe,
    peakDbfs: measured.peakDbfs,
    rmsDbfs: measured.rmsDbfs,
    integratedLufsApprox: measured.integratedLufsApprox,
    integratedLufs: measured.integratedLufs,
    momentaryLufs: measured.momentaryLufs,
    shortTermLufs: measured.shortTermLufs,
    loudnessRangeLu: measured.loudnessRangeLu,
    truePeakDbtp: measured.truePeakDbtp,
    loudnessProvenance: measured.loudnessProvenance,
    loudnessMeasured: true,
    loudnessMethod: "decoded",
    loudnessSampleRate: measured.analysisSampleRate,
    loudnessResampled: measured.resampled,
    channels: probe.channels ?? measured.channels,
    // Decoded duration is exact; prefer it over a bitrate-derived estimate.
    durationSeconds:
      probe.durationSeconds !== undefined && probe.durationEstimated !== true
        ? probe.durationSeconds
        : measured.durationSeconds,
    durationEstimated: false,
  };
}

export async function probeArtworkFile(file: {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<ArtworkProbe> {
  const buffer = await file.arrayBuffer();
  const probe = await runProbe({
    type: "probe-artwork",
    requestId: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    buffer,
  });
  return probe as unknown as ArtworkProbe;
}
