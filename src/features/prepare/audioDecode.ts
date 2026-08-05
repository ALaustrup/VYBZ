/**
 * Host-side audio decode. Web Audio is the only decoder available in the browser
 * for compressed formats (MP3, FLAC, AAC, Ogg) and it is not exposed to workers,
 * so decoding happens here and the raw channel data is handed to the worker.
 *
 * Returns `null` for anything we cannot decode. Callers must then report
 * "Not measured" — never a substituted value.
 */

/** Above this we decline to decode rather than risk exhausting device memory. */
export const MAX_DECODE_BYTES = 96 * 1024 * 1024;

const FALLBACK_SAMPLE_RATE = 48000;
const MIN_CONTEXT_RATE = 8000;
const MAX_CONTEXT_RATE = 96000;

export type DecodedChannels = {
  channels: Float32Array[];
  /** Rate the decoder produced — equals the container rate only when we could request it. */
  sampleRate: number;
  /** True when the decode rate could not be pinned to the container's declared rate. */
  resampled: boolean;
};

type OfflineCtor = new (channels: number, length: number, sampleRate: number) => {
  decodeAudioData: (buffer: ArrayBuffer) => Promise<AudioBuffer>;
};

function offlineContextCtor(): OfflineCtor | null {
  const g = globalThis as unknown as {
    OfflineAudioContext?: OfflineCtor;
    webkitOfflineAudioContext?: OfflineCtor;
  };
  return g.OfflineAudioContext ?? g.webkitOfflineAudioContext ?? null;
}

export function canDecodeAudio(): boolean {
  return offlineContextCtor() !== null;
}

export async function decodeAudioChannels(
  buffer: ArrayBuffer,
  opts: { nativeSampleRate?: number } = {}
): Promise<DecodedChannels | null> {
  const Ctor = offlineContextCtor();
  if (!Ctor) return null;
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_DECODE_BYTES) return null;

  const requested = opts.nativeSampleRate;
  const contextRate =
    requested && requested >= MIN_CONTEXT_RATE && requested <= MAX_CONTEXT_RATE
      ? requested
      : FALLBACK_SAMPLE_RATE;

  try {
    const ctx = new Ctor(1, 1, contextRate);
    // decodeAudioData detaches its input, so hand it a copy the caller can discard.
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    if (decoded.length === 0 || decoded.numberOfChannels === 0) return null;

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      channels.push(decoded.getChannelData(ch).slice(0));
    }
    return {
      channels,
      sampleRate: decoded.sampleRate,
      resampled: requested === undefined || decoded.sampleRate !== requested,
    };
  } catch {
    return null;
  }
}
