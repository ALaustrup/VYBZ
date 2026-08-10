/**
 * M9 — VDock comparison preview helpers (Law 5 / Masterplan comparison engine).
 * Loudness-matched listen buffers only; downloads stay dry/unmatched.
 */

import {
  describeMatchGains,
  LOUDNESS_MATCH_COMPARE_VERSION,
  matchLoudnessForCompare,
} from "@vybz/processing/waveform";
import { encodeWav } from "@/lib/audioEdit";
import {
  localSignal,
  simulationSignal,
  type PlaybackSignal,
} from "@/lib/vdock/playbackSignal";

export const VDOCK_COMPARE_PREVIEW_VERSION = "m9.compare-preview.1";

export type MatchedCompareObjectUrls = {
  aUrl: string;
  bUrl: string;
  matchLabel: string;
  matchVersion: typeof LOUDNESS_MATCH_COMPARE_VERSION;
  compareVersion: typeof VDOCK_COMPARE_PREVIEW_VERSION;
};

export function planarFromAudioBuffer(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.push(buf.getChannelData(c).slice());
  }
  return out;
}

export function audioBufferFromPlanar(
  channels: Float32Array[],
  sampleRate: number,
): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  const ch = Math.max(1, channels.length);
  const ctx = new OfflineAudioContext(ch, Math.max(1, length), sampleRate);
  const buf = ctx.createBuffer(ch, Math.max(1, length), sampleRate);
  for (let c = 0; c < channels.length; c++) {
    buf.getChannelData(c).set(channels[c]!);
  }
  return buf;
}

/** Build blob URLs for loudness-matched A/B listening (caller must revoke). */
export function buildMatchedCompareObjectUrls(
  a: Float32Array[],
  b: Float32Array[],
  sampleRate: number,
): MatchedCompareObjectUrls {
  const pair = matchLoudnessForCompare(a, b, sampleRate);
  return {
    aUrl: URL.createObjectURL(encodeWav(audioBufferFromPlanar(pair.a, sampleRate))),
    bUrl: URL.createObjectURL(encodeWav(audioBufferFromPlanar(pair.b, sampleRate))),
    matchLabel: describeMatchGains(pair),
    matchVersion: pair.correctionVersion,
    compareVersion: VDOCK_COMPARE_PREVIEW_VERSION,
  };
}

export function revokeCompareObjectUrls(urls: {
  aUrl?: string | null;
  bUrl?: string | null;
}) {
  if (urls.aUrl) URL.revokeObjectURL(urls.aUrl);
  if (urls.bUrl) URL.revokeObjectURL(urls.bUrl);
}

/** A (original) — matched listen is itself a disclosed simulation of level. */
export function compareSideASignal(matched: boolean): PlaybackSignal {
  if (!matched) return localSignal();
  return simulationSignal(
    `Loudness-matched original reference (${LOUDNESS_MATCH_COMPARE_VERSION}); download remains dry [${VDOCK_COMPARE_PREVIEW_VERSION}]`,
  );
}

/** B (processed) — always simulation; disclose match when listen levels are adjusted. */
export function compareSideBSignal(processLabel: string, matched: boolean): PlaybackSignal {
  if (!matched) {
    return simulationSignal(
      `${processLabel}; unmatched listen levels [${VDOCK_COMPARE_PREVIEW_VERSION}]`,
    );
  }
  return simulationSignal(
    `${processLabel}; loudness-matched listen (${LOUDNESS_MATCH_COMPARE_VERSION}); download remains unmatched [${VDOCK_COMPARE_PREVIEW_VERSION}]`,
  );
}
