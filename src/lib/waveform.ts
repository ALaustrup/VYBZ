// ---------------------------------------------------------------------------
// Audio ingest pipeline (VYBZ Phase 3, §8.4).
//
// On upload we decode the file with the Web Audio API and compute a downsampled
// peaks array (default 800 buckets) for an instant, GPU-cheap waveform preview.
// We NEVER re-encode or degrade the original here — the decoded PCM is only used
// to measure peaks + duration; the original bytes are what get stored/exchanged
// so quality is preserved losslessly (§6.2).
// ---------------------------------------------------------------------------

/** Formats a DAW can export that we accept for upload (§6.2). */
export const AUDIO_EXTENSIONS = [
  "wav", "aiff", "aif", "flac", "alac", "mp3", "ogg", "oga", "opus",
  "m4a", "aac", "mid", "midi",
] as const;

/** Lossless containers — drive the "HD / Lossless" quality badge. */
const LOSSLESS_EXT = new Set(["wav", "aiff", "aif", "flac", "alac"]);

/** Accept attribute for the audio file input (all common formats + MIDI + zip). */
export const AUDIO_ACCEPT =
  "audio/*,.wav,.aiff,.aif,.flac,.alac,.mp3,.ogg,.oga,.opus,.m4a,.aac,.mid,.midi,.zip";

export interface WaveformResult {
  /** Normalized peaks in 0..1, one per bucket. */
  peaks: number[];
  /** Duration in seconds. */
  duration: number;
  /** Decoded sample rate (Hz). */
  sampleRate: number;
  /** Channel count. */
  channels: number;
}

export interface AudioMeta {
  /** Uppercase container/codec label for the tech strip ('WAV','MP3',…). */
  format: string;
  /** True for lossless containers. */
  lossless: boolean;
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** True for files we treat as an audio drop (by MIME or extension). */
export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = extOf(file.name);
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

/** Derive the display format + lossless flag from a file. */
export function audioMeta(file: File): AudioMeta {
  const ext = extOf(file.name);
  const fromExt = ext.replace("aif", "aiff").replace("midi", "mid");
  const label =
    fromExt ||
    (file.type.split("/")[1] ?? "audio").replace("mpeg", "mp3");
  return {
    format: label.toUpperCase(),
    lossless: LOSSLESS_EXT.has(ext),
  };
}

/** A human tech-strip quality label, e.g. "24-bit · 48 kHz" or "MP3 · 44.1 kHz". */
export function qualityLabel(
  format: string | undefined,
  sampleRate: number | undefined,
  lossless: boolean | undefined
): string {
  const parts: string[] = [];
  if (format) parts.push(format);
  if (sampleRate) parts.push(`${(sampleRate / 1000).toFixed(sampleRate % 1000 ? 1 : 0)} kHz`);
  if (lossless) parts.push("Lossless");
  return parts.join(" · ");
}

let sharedDecodeCtx: AudioContext | null = null;
function decodeCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedDecodeCtx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      sharedDecodeCtx = new AC();
    } catch {
      return null;
    }
  }
  return sharedDecodeCtx;
}

/**
 * Decode an audio file into a normalized peaks array + duration. Returns null
 * when the browser can't decode the container (e.g. raw MIDI) — callers fall
 * back to a flat placeholder waveform so the drop still posts.
 */
export async function computeWaveform(
  file: Blob,
  buckets = 800
): Promise<WaveformResult | null> {
  const ctx = decodeCtx();
  if (!ctx) return null;
  let buffer: AudioBuffer;
  try {
    const arr = await file.arrayBuffer();
    buffer = await ctx.decodeAudioData(arr.slice(0));
  } catch {
    return null;
  }

  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const block = Math.max(1, Math.floor(length / buckets));
  const peaks = new Array<number>(buckets).fill(0);

  // Peak per bucket across all channels (mono-summed magnitude).
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let b = 0; b < buckets; b++) {
      let max = 0;
      const start = b * block;
      const end = Math.min(length, start + block);
      for (let i = start; i < end; i++) {
        const v = Math.abs(data[i]);
        if (v > max) max = v;
      }
      if (max > peaks[b]) peaks[b] = max;
    }
  }

  // Normalize to 0..1 against the loudest peak so quiet clips still show shape.
  const loudest = peaks.reduce((m, v) => (v > m ? v : m), 0) || 1;
  const norm = peaks.map((p) => Math.min(1, p / loudest));

  return {
    peaks: norm,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    channels,
  };
}

/** A deterministic, seeded placeholder waveform (for undecodable files/MIDI). */
export function placeholderWaveform(seed: number, buckets = 800): number[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const peaks: number[] = [];
  for (let i = 0; i < buckets; i++) {
    const env = 0.4 + 0.5 * Math.sin((i / buckets) * Math.PI);
    peaks.push(Math.min(1, env * (0.35 + rnd() * 0.65)));
  }
  return peaks;
}
