/**
 * Vite Web Worker entry — container probes plus loudness maths on decoded PCM.
 * Lives under src/ so `?worker` resolves reliably (package alias + ?worker breaks Vite).
 */
import { probeContainer, probeFixtures } from "@vybz/processing/readiness";
import {
  analyzeWavBuffer,
  computeLoudness,
  computeSpectrum,
  measureBs1770,
  measureClipIntegrity,
  measureCrestFactorDb,
  measureChannelBalance,
  measureDcOffset,
  measureEdgeSilence,
  measureIspOvershootDb,
  measureMainsHum,
  measureMidSide,
  measureMonoCompat,
  measurePlrDb,
  measureSpectralBalance,
  measureStereoCorrelation,
  PORTABLE_FFT_MAX_BYTES,
} from "@vybz/processing/waveform";
import type { WorkerProbeRequest, WorkerProbeResponse } from "@vybz/processing/readiness";

const { parseArtistTitle, probeWav, probePng, probeJpeg } = probeFixtures;

const scope = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<WorkerProbeRequest>) => void) | null;
  postMessage: (msg: WorkerProbeResponse) => void;
};

function postProgress(
  requestId: string,
  stage: Extract<WorkerProbeResponse, { type: "progress" }>["stage"],
  percent: number
) {
  scope.postMessage({ type: "progress", requestId, stage, percent });
}

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

function handleMeasureLoudness(msg: Extract<WorkerProbeRequest, { type: "measure-loudness" }>): WorkerProbeResponse {
  const samples = downmix(msg.channels);
  if (samples.length === 0 || msg.sampleRate <= 0) {
    return {
      type: "loudness-result",
      requestId: msg.requestId,
      ok: false,
      error: "Decoded stream contained no samples",
    };
  }
  postProgress(msg.requestId, "measuring", 58);
  const durationSeconds = samples.length / msg.sampleRate;
  const approx = computeLoudness({
    samples,
    sampleRate: msg.sampleRate,
    channels: msg.channels.length,
    durationSeconds,
  });
  postProgress(msg.requestId, "measuring", 72);
  // Preserve planar channels — BS.1770 channel weights require stereo/surround layout.
  const bs = measureBs1770(msg.channels, msg.sampleRate, "web-worker");
  const spectrum = computeSpectrum(samples, 1024);
  const balance = measureSpectralBalance(spectrum.magnitudes, spectrum.fftSize, msg.sampleRate);
  const clips = measureClipIntegrity(msg.channels);
  const edges = measureEdgeSilence(msg.channels, msg.sampleRate);
  const dc = measureDcOffset(msg.channels);
  const mono = measureMonoCompat(msg.channels);
  const chBal = measureChannelBalance(msg.channels);
  const ms = measureMidSide(msg.channels);
  const hum = measureMainsHum(samples, msg.sampleRate);
  const plrDb =
    bs.truePeakDbtp != null && bs.integratedLufs != null
      ? measurePlrDb(bs.truePeakDbtp, bs.integratedLufs)
      : undefined;
  const ispOvershootDb =
    bs.truePeakDbtp != null
      ? measureIspOvershootDb(bs.truePeakDbtp, bs.samplePeakDbfs)
      : undefined;
  postProgress(msg.requestId, "measuring", 88);
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
      crestFactorDb: measureCrestFactorDb(bs.samplePeakDbfs, approx.rmsDbfs),
      stereoCorrelation: measureStereoCorrelation(msg.channels),
      spectralBalance: balance
        ? {
            lowShare: balance.lowShare,
            midShare: balance.midShare,
            highShare: balance.highShare,
          }
        : undefined,
      clippedSamples: clips.clippedSamples,
      maxClipRun: clips.maxClipRun,
      silenceLeadInSeconds: edges?.leadInSeconds,
      silenceLeadOutSeconds: edges?.leadOutSeconds,
      dcOffsetAbs: dc ? Math.abs(dc.mean) : undefined,
      dcOffsetDbfs: dc?.meanAbsDbfs,
      monoLossDb: mono?.monoLossDb,
      channelBalanceDb: chBal?.deltaDb,
      leftRmsDbfs: chBal?.leftRmsDbfs,
      rightRmsDbfs: chBal?.rightRmsDbfs,
      plrDb,
      midRmsDbfs: ms?.midRmsDbfs,
      sideRmsDbfs: ms?.sideRmsDbfs,
      sideToMidDb: ms?.sideToMidDb,
      ispOvershootDb,
      mainsHumHz: hum?.frequencyHz,
      mainsHumProminenceDb: hum?.prominenceDb,
      analysisSampleRate: msg.sampleRate,
      channels: msg.channels.length,
      durationSeconds,
    },
  };
}

function handleProbeAudio(msg: Extract<WorkerProbeRequest, { type: "probe-audio" }>): WorkerProbeResponse {
  postProgress(msg.requestId, "container", 18);
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

  postProgress(msg.requestId, "container", 28);

  if (isWav && msg.sizeBytes <= PORTABLE_FFT_MAX_BYTES) {
    try {
      postProgress(msg.requestId, "measuring", 45);
      const analysis = analyzeWavBuffer(msg.buffer, {
        sizeBytes: msg.sizeBytes,
        includeSpectrum: true,
        enforcePortableLimit: true,
      });
      postProgress(msg.requestId, "measuring", 82);
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
        crestFactorDb: analysis.crestFactorDb,
        stereoCorrelation: analysis.stereoCorrelation,
        spectralBalance: analysis.spectralBalance,
        clippedSamples: analysis.clippedSamples,
        maxClipRun: analysis.maxClipRun,
        silenceLeadInSeconds: analysis.silenceLeadInSeconds,
        silenceLeadOutSeconds: analysis.silenceLeadOutSeconds,
        dcOffsetAbs: analysis.dcOffsetAbs,
        dcOffsetDbfs: analysis.dcOffsetDbfs,
        monoLossDb: analysis.monoLossDb,
        channelBalanceDb: analysis.channelBalanceDb,
        leftRmsDbfs: analysis.leftRmsDbfs,
        rightRmsDbfs: analysis.rightRmsDbfs,
        plrDb: analysis.plrDb,
        midRmsDbfs: analysis.midRmsDbfs,
        sideRmsDbfs: analysis.sideRmsDbfs,
        sideToMidDb: analysis.sideToMidDb,
        ispOvershootDb: analysis.ispOvershootDb,
        mainsHumHz: analysis.mainsHumHz,
        mainsHumProminenceDb: analysis.mainsHumProminenceDb,
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

function handleProbeArtwork(msg: Extract<WorkerProbeRequest, { type: "probe-artwork" }>): WorkerProbeResponse {
  postProgress(msg.requestId, "artwork", 86);
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
}

function handle(msg: WorkerProbeRequest): WorkerProbeResponse {
  try {
    if (msg.type === "measure-loudness") return handleMeasureLoudness(msg);
    if (msg.type === "probe-audio") return handleProbeAudio(msg);
    return handleProbeArtwork(msg);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Probe failed";
    if (msg.type === "measure-loudness") {
      return { type: "loudness-result", requestId: msg.requestId, ok: false, error };
    }
    return { type: "probe-result", requestId: msg.requestId, ok: false, error };
  }
}

scope.onmessage = (ev) => {
  scope.postMessage(handle(ev.data));
};
