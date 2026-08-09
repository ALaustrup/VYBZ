import {
  applyChannelBalance,
  applyClickAttenuate,
  applyLoudnessGain,
  applyMainsHumReduce,
  applyPeakSafety,
  applySilenceTrim,
  applySpectralEqAssist,
  applyStereoWidth,
  removeDcOffset,
} from "@vybz/processing/waveform";
import { masterPcm, encodeWavPcm16 } from "@vybz/processing/mastering";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import type { AutoFixOp } from "@/features/prepare/autoFixMap";

function planarFromBuffer(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) out.push(buf.getChannelData(c).slice());
  return out;
}

function bufferFromPlanar(channels: Float32Array[], sampleRate: number): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  const ctx = new OfflineAudioContext(channels.length || 1, Math.max(1, length), sampleRate);
  const buf = ctx.createBuffer(channels.length || 1, Math.max(1, length), sampleRate);
  channels.forEach((ch, i) => {
    const copy = new Float32Array(ch.length);
    copy.set(ch);
    buf.copyToChannel(copy, i);
  });
  return buf;
}

function interleave(channels: Float32Array[]): Float32Array {
  const n = channels[0]?.length ?? 0;
  const ch = channels.length;
  const out = new Float32Array(n * ch);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) out[i * ch + c] = channels[c]![i]!;
  }
  return out;
}

/** Apply a Tier A auto-fix; returns a WAV blob (never mutates the input). */
export async function applyAutoFixToBlob(blob: Blob, op: AutoFixOp): Promise<Blob> {
  const file = blob instanceof File ? blob : new File([blob], "fix.wav", { type: blob.type || "audio/wav" });
  const buf = await decodeToBuffer(file);
  const planar = planarFromBuffer(buf);
  const rate = buf.sampleRate;

  if (op === "level") {
    const interleaved = interleave(planar);
    const { samples } = masterPcm(interleaved, rate, planar.length, {
      targetRmsDbfs: -14,
      peakCeiling: 0.95,
      stereoWidth: 1,
    });
    const ab = encodeWavPcm16(samples, rate, planar.length);
    return new Blob([ab], { type: "audio/wav" });
  }

  let next: Float32Array[];
  if (op === "dc") next = removeDcOffset(planar).channels;
  else if (op === "peak") next = applyPeakSafety(planar).channels;
  else if (op === "balance") next = applyChannelBalance(planar).channels;
  else if (op === "hum") next = applyMainsHumReduce(planar, rate).channels;
  else if (op === "widthWiden") next = applyStereoWidth(planar, { mode: "widen" }).channels;
  else if (op === "widthNarrow") next = applyStereoWidth(planar, { mode: "narrow" }).channels;
  else if (op === "eqCutBass") next = applySpectralEqAssist(planar, rate, { mode: "cutBass" }).channels;
  else if (op === "eqCutBright") next = applySpectralEqAssist(planar, rate, { mode: "cutBright" }).channels;
  else if (op === "eqBoostLow") next = applySpectralEqAssist(planar, rate, { mode: "boostLow" }).channels;
  else if (op === "click") next = applyClickAttenuate(planar, rate).channels;
  else if (op === "loudness") next = applyLoudnessGain(planar, rate).channels;
  else next = applySilenceTrim(planar, rate).channels;

  const outBuf = bufferFromPlanar(next, rate);
  return encodeWav(outBuf);
}
