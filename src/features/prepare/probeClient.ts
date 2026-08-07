import type { AudioProbe, ArtworkProbe } from "@vybz/domain/releases";
import type { MeasuredLoudness, WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";
import { decodeAudioChannels } from "@/features/prepare/audioDecode";
import { scanProgress, type ScanProgress } from "@/features/prepare/scanProgress";
import ReadinessWorker from "./readiness.worker?worker";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) worker = new ReadinessWorker();
  return worker;
}

export type ProbeProgressHandler = (progress: ScanProgress) => void;

function mapWorkerStage(
  stage: Extract<WorkerProbeResponse, { type: "progress" }>["stage"],
  percent: number
): ScanProgress {
  if (stage === "artwork") return scanProgress("artwork", percent);
  if (stage === "measuring") return scanProgress("measuring", percent);
  return scanProgress("container", percent);
}

function send(
  request: WorkerProbeRequest,
  transfer: Transferable[],
  onProgress?: ProbeProgressHandler
): Promise<WorkerProbeResponse> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent<WorkerProbeResponse>) => {
      if (ev.data.requestId !== request.requestId) return;
      if (ev.data.type === "progress") {
        onProgress?.(mapWorkerStage(ev.data.stage, ev.data.percent));
        return;
      }
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      resolve(ev.data);
    };
    const onError = (ev: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(new Error(ev.message || "Readiness worker failed"));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage(request, transfer);
  });
}

async function runProbe(
  request: Extract<WorkerProbeRequest, { type: "probe-audio" | "probe-artwork" }>,
  onProgress?: ProbeProgressHandler
): Promise<Record<string, unknown>> {
  const res = await send(request, [request.buffer], onProgress);
  if (res.type !== "probe-result") throw new Error("Unexpected worker response");
  if (!res.ok) throw new Error(res.error);
  return res.probe;
}

/**
 * Measure loudness from an already-read buffer. Resolves `null` whenever decode
 * or measurement is unavailable so the caller reports "Not measured".
 */
async function measureLoudnessFromBuffer(
  buffer: ArrayBuffer,
  nativeSampleRate: number | undefined,
  onProgress?: ProbeProgressHandler
): Promise<(MeasuredLoudness & { resampled: boolean }) | null> {
  onProgress?.(scanProgress("decoding", 38));
  let decoded: Awaited<ReturnType<typeof decodeAudioChannels>> = null;
  try {
    decoded = await decodeAudioChannels(buffer, { nativeSampleRate });
  } catch {
    return null;
  }
  if (!decoded) return null;

  onProgress?.(scanProgress("measuring", 52));
  try {
    const res = await send(
      {
        type: "measure-loudness",
        requestId: crypto.randomUUID(),
        channels: decoded.channels,
        sampleRate: decoded.sampleRate,
      },
      decoded.channels.map((c) => c.buffer),
      onProgress
    );
    if (res.type !== "loudness-result" || !res.ok) return null;
    return { ...res.metrics, resampled: decoded.resampled };
  } catch {
    return null;
  }
}

export async function probeAudioFile(
  file: {
    name: string;
    type: string;
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
  },
  onProgress?: ProbeProgressHandler
): Promise<AudioProbe> {
  onProgress?.(scanProgress("reading", 6));
  const buffer = await file.arrayBuffer();
  onProgress?.(scanProgress("container", 14));

  const probe = (await runProbe(
    {
      type: "probe-audio",
      requestId: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      buffer,
    },
    onProgress
  )) as unknown as AudioProbe;

  // WAV already measured in-worker from PCM. Everything else needs a host decode.
  if (probe.loudnessMeasured) {
    onProgress?.(scanProgress("measuring", 90));
    return probe;
  }

  const measured = await measureLoudnessFromBuffer(buffer, probe.sampleRate, onProgress);
  if (!measured) return probe;

  onProgress?.(scanProgress("measuring", 92));
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
    crestFactorDb: measured.crestFactorDb,
    stereoCorrelation: measured.stereoCorrelation,
    spectralBalance: measured.spectralBalance,
    clippedSamples: measured.clippedSamples,
    maxClipRun: measured.maxClipRun,
    silenceLeadInSeconds: measured.silenceLeadInSeconds,
    silenceLeadOutSeconds: measured.silenceLeadOutSeconds,
    dcOffsetAbs: measured.dcOffsetAbs,
    dcOffsetDbfs: measured.dcOffsetDbfs,
    monoLossDb: measured.monoLossDb,
    channelBalanceDb: measured.channelBalanceDb,
    leftRmsDbfs: measured.leftRmsDbfs,
    rightRmsDbfs: measured.rightRmsDbfs,
    plrDb: measured.plrDb,
    midRmsDbfs: measured.midRmsDbfs,
    sideRmsDbfs: measured.sideRmsDbfs,
    sideToMidDb: measured.sideToMidDb,
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

export async function probeArtworkFile(
  file: {
    name: string;
    type: string;
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
  },
  onProgress?: ProbeProgressHandler
): Promise<ArtworkProbe> {
  onProgress?.(scanProgress("artwork", 84));
  const buffer = await file.arrayBuffer();
  const probe = await runProbe(
    {
      type: "probe-artwork",
      requestId: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      buffer,
    },
    onProgress
  );
  return probe as unknown as ArtworkProbe;
}
