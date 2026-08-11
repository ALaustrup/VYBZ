/**
 * OR-037 — Converter output formats (browser-honest matrix).
 * Never claim MP3/AAC encode when the browser cannot do it.
 */

import { encodeWav } from "@/lib/audioEdit";

export type ConverterOutFormat = "wav16" | "wav24" | "opus-webm";

export type ConverterFormatInfo = {
  id: ConverterOutFormat;
  label: string;
  extension: string;
  mime: string;
  lossless: boolean;
  available: boolean;
  note: string;
};

/** Encode PCM AudioBuffer as 24-bit little-endian WAV. */
export function encodeWav24(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 3;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const header = 44;
  const ab = new ArrayBuffer(header + dataSize);
  const view = new DataView(ab);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 24, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) channelData.push(buffer.getChannelData(c));

  let offset = header;
  for (let f = 0; f < length; f++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, channelData[c]![f] ?? 0));
      const int = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
      view.setUint8(offset, int & 0xff);
      view.setUint8(offset + 1, (int >> 8) & 0xff);
      view.setUint8(offset + 2, (int >> 16) & 0xff);
      offset += 3;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

/** Downmix to mono (average of channels). */
export function toMonoBuffer(buffer: AudioBuffer): AudioBuffer {
  if (buffer.numberOfChannels <= 1) return buffer;
  const out = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: 1,
    sampleRate: buffer.sampleRate,
  });
  const dest = out.getChannelData(0);
  const n = buffer.numberOfChannels;
  for (let i = 0; i < buffer.length; i++) {
    let sum = 0;
    for (let c = 0; c < n; c++) sum += buffer.getChannelData(c)[i] ?? 0;
    dest[i] = sum / n;
  }
  return out;
}

function pickOpusMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return null;
}

export function isOpusWebmAvailable(): boolean {
  return pickOpusMime() !== null;
}

/**
 * Lossy Opus-in-WebM via MediaRecorder when the browser supports it.
 * Plays the buffer into a MediaStreamDestination and records.
 */
export async function encodeOpusWebm(buffer: AudioBuffer): Promise<Blob> {
  const mime = pickOpusMime();
  if (!mime) throw new Error("This browser cannot encode Opus/WebM");

  const ctx = new AudioContext({ sampleRate: buffer.sampleRate });
  try {
    const dest = ctx.createMediaStreamDestination();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(dest);

    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(dest.stream, { mimeType: mime });
    const done = new Promise<Blob>((resolve, reject) => {
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => reject(new Error("Opus encode failed"));
      rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });

    rec.start(100);
    src.start(0);
    await new Promise<void>((resolve) => {
      src.onended = () => resolve();
      window.setTimeout(resolve, Math.ceil(buffer.duration * 1000) + 400);
    });
    if (rec.state !== "inactive") rec.stop();
    return await done;
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

export function listConverterFormats(): ConverterFormatInfo[] {
  const opusOk = isOpusWebmAvailable();
  return [
    {
      id: "wav16",
      label: "WAV 16-bit PCM",
      extension: "wav",
      mime: "audio/wav",
      lossless: true,
      available: true,
      note: "Universal delivery master (PCM).",
    },
    {
      id: "wav24",
      label: "WAV 24-bit PCM",
      extension: "wav",
      mime: "audio/wav",
      lossless: true,
      available: true,
      note: "Higher bit-depth PCM WAV.",
    },
    {
      id: "opus-webm",
      label: "Opus in WebM",
      extension: "webm",
      mime: "audio/webm",
      lossless: false,
      available: opusOk,
      note: opusOk
        ? "Lossy Opus via MediaRecorder — quality is browser-dependent."
        : "Not available in this browser (no MediaRecorder Opus/WebM).",
    },
  ];
}

/** Formats we intentionally do not offer to encode (Law 1 honesty). */
export const CONVERTER_UNAVAILABLE_ENCODE = [
  { id: "mp3", label: "MP3", reason: "Browsers have no MP3 encoder API." },
  { id: "aac", label: "AAC / M4A", reason: "No reliable cross-browser AAC encoder." },
  { id: "flac", label: "FLAC", reason: "No native browser FLAC encoder." },
] as const;

export async function encodeConverterOutput(
  buffer: AudioBuffer,
  format: ConverterOutFormat,
): Promise<{ blob: Blob; extension: string; mime: string; label: string }> {
  const info = listConverterFormats().find((f) => f.id === format);
  if (!info?.available) throw new Error(`Format ${format} is not available`);
  if (format === "wav16") {
    return { blob: encodeWav(buffer), extension: "wav", mime: "audio/wav", label: "WAV 16-bit" };
  }
  if (format === "wav24") {
    return { blob: encodeWav24(buffer), extension: "wav", mime: "audio/wav", label: "WAV 24-bit" };
  }
  const blob = await encodeOpusWebm(buffer);
  return { blob, extension: "webm", mime: blob.type || "audio/webm", label: "Opus/WebM" };
}
