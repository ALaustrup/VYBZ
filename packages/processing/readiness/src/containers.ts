/**
 * Portable container header probes for compressed / lossless audio.
 * No DOM, no network, no decoding — these read declared stream properties only.
 *
 * Law 1: every field returned here is read from the file. Anything unreadable is
 * omitted (never defaulted), and any value derived rather than declared is
 * flagged via `durationEstimated`.
 */

export type ContainerProbe = {
  container?: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  durationSeconds?: number;
  /** True when duration was derived from bitrate + byte count, not declared. */
  durationEstimated?: boolean;
  bitrateKbps?: number;
  /** "cbr" when derived from a constant bitrate, "vbr" when a Xing/VBRI frame count was found. */
  bitrateMode?: "cbr" | "vbr";
  codecProfile?: string;
};

const MP3_SAMPLE_RATES: Record<string, readonly number[]> = {
  "1": [44100, 48000, 32000],
  "2": [22050, 24000, 16000],
  "2.5": [11025, 12000, 8000],
};

/** Layer III bitrate tables (kbps). Index 0 (free) and 15 (bad) are invalid. */
const MP3_BITRATES_L3: Record<string, readonly number[]> = {
  "1": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

function readAscii(view: DataView, offset: number, len: number): string {
  if (offset < 0 || offset + len > view.byteLength) return "";
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

/** ID3v2 header is 10 bytes + a syncsafe size, optionally followed by a 10-byte footer. */
function id3v2Size(view: DataView): number {
  if (view.byteLength < 10 || readAscii(view, 0, 3) !== "ID3") return 0;
  const flags = view.getUint8(5);
  const size =
    (view.getUint8(6) & 0x7f) * 0x200000 +
    (view.getUint8(7) & 0x7f) * 0x4000 +
    (view.getUint8(8) & 0x7f) * 0x80 +
    (view.getUint8(9) & 0x7f);
  return 10 + size + ((flags & 0x10) !== 0 ? 10 : 0);
}

function hasId3v1(view: DataView): boolean {
  if (view.byteLength < 128) return false;
  return readAscii(view, view.byteLength - 128, 3) === "TAG";
}

/**
 * Probe an MPEG audio (MP3) stream: first valid Layer III frame header, plus a
 * Xing/Info or VBRI frame count when the encoder wrote one.
 */
export function probeMp3(buffer: ArrayBuffer, sizeBytes?: number): ContainerProbe {
  const view = new DataView(buffer);
  const out: ContainerProbe = { container: "mp3" };
  const start = id3v2Size(view);
  const scanLimit = Math.min(view.byteLength - 4, start + 256 * 1024);

  for (let i = Math.max(0, start); i <= scanLimit; i++) {
    if (view.getUint8(i) !== 0xff) continue;
    const b1 = view.getUint8(i + 1);
    if ((b1 & 0xe0) !== 0xe0) continue;

    const versionBits = (b1 >> 3) & 0x03;
    const layerBits = (b1 >> 1) & 0x03;
    if (versionBits === 0x01 || layerBits === 0x00) continue;

    const version = versionBits === 0x03 ? "1" : versionBits === 0x02 ? "2" : "2.5";
    const layer = layerBits === 0x03 ? 1 : layerBits === 0x02 ? 2 : 3;

    const b2 = view.getUint8(i + 2);
    const bitrateIndex = (b2 >> 4) & 0x0f;
    const rateIndex = (b2 >> 2) & 0x03;
    if (bitrateIndex === 0 || bitrateIndex === 0x0f || rateIndex === 0x03) continue;

    const sampleRate = MP3_SAMPLE_RATES[version]?.[rateIndex];
    if (!sampleRate) continue;

    const channelMode = (view.getUint8(i + 3) >> 6) & 0x03;
    const channels = channelMode === 0x03 ? 1 : 2;

    out.sampleRate = sampleRate;
    out.channels = channels;
    out.codecProfile = `MPEG-${version} Layer ${"I".repeat(layer)}`;

    if (layer !== 3) return out;

    const table = MP3_BITRATES_L3[version === "1" ? "1" : "2"];
    const bitrateKbps = table?.[bitrateIndex];
    if (bitrateKbps) out.bitrateKbps = bitrateKbps;

    const samplesPerFrame = version === "1" ? 1152 : 576;
    const frameCount = readFrameCount(view, i, version, channels);

    if (frameCount && frameCount > 0) {
      out.durationSeconds = (frameCount * samplesPerFrame) / sampleRate;
      out.bitrateMode = "vbr";
    } else if (bitrateKbps) {
      const total = sizeBytes ?? view.byteLength;
      const audioBytes = total - start - (hasId3v1(view) ? 128 : 0);
      if (audioBytes > 0) {
        out.durationSeconds = (audioBytes * 8) / (bitrateKbps * 1000);
        out.durationEstimated = true;
        out.bitrateMode = "cbr";
      }
    }
    return out;
  }

  return out;
}

/** Xing/Info (after side info) or VBRI (fixed offset) total frame count. */
function readFrameCount(
  view: DataView,
  frameStart: number,
  version: string,
  channels: number
): number | null {
  const sideInfo = version === "1" ? (channels === 1 ? 17 : 32) : channels === 1 ? 9 : 17;
  const xingAt = frameStart + 4 + sideInfo;
  const xingTag = readAscii(view, xingAt, 4);
  if (xingTag === "Xing" || xingTag === "Info") {
    if (xingAt + 12 <= view.byteLength) {
      const flags = view.getUint32(xingAt + 4, false);
      if ((flags & 0x01) !== 0) return view.getUint32(xingAt + 8, false);
    }
    return null;
  }

  const vbriAt = frameStart + 4 + 32;
  if (readAscii(view, vbriAt, 4) === "VBRI" && vbriAt + 18 <= view.byteLength) {
    return view.getUint32(vbriAt + 14, false);
  }
  return null;
}

/**
 * Probe a native FLAC stream's STREAMINFO block. `totalSamples` of 0 means the
 * encoder did not declare a length, so duration stays unset rather than guessed.
 */
export function probeFlac(buffer: ArrayBuffer): ContainerProbe {
  const view = new DataView(buffer);
  const out: ContainerProbe = { container: "flac" };
  if (readAscii(view, 0, 4) !== "fLaC") return out;
  if (view.byteLength < 4 + 4 + 34) return out;

  const blockType = view.getUint8(4) & 0x7f;
  const blockLength = (view.getUint8(5) << 16) | (view.getUint8(6) << 8) | view.getUint8(7);
  if (blockType !== 0 || blockLength < 34) return out;

  const b = 8;
  const sampleRate =
    (view.getUint8(b + 10) << 12) | (view.getUint8(b + 11) << 4) | (view.getUint8(b + 12) >> 4);
  const channels = ((view.getUint8(b + 12) >> 1) & 0x07) + 1;
  const bitDepth = (((view.getUint8(b + 12) & 0x01) << 4) | (view.getUint8(b + 13) >> 4)) + 1;
  const totalSamples =
    (view.getUint8(b + 13) & 0x0f) * 2 ** 32 +
    view.getUint8(b + 14) * 2 ** 24 +
    view.getUint8(b + 15) * 2 ** 16 +
    view.getUint8(b + 16) * 2 ** 8 +
    view.getUint8(b + 17);

  if (sampleRate > 0) out.sampleRate = sampleRate;
  out.channels = channels;
  out.bitDepth = bitDepth;
  if (sampleRate > 0 && totalSamples > 0) out.durationSeconds = totalSamples / sampleRate;
  return out;
}

/** Pick the right container probe from filename + MIME, or null when unsupported. */
export function probeContainer(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  sizeBytes?: number
): ContainerProbe | null {
  const lower = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();
  if (lower.endsWith(".mp3") || mime.includes("mpeg") || mime.includes("mp3")) {
    return probeMp3(buffer, sizeBytes);
  }
  if (lower.endsWith(".flac") || mime.includes("flac")) {
    return probeFlac(buffer);
  }
  return null;
}
