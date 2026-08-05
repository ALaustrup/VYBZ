/** Shared portable probes for worker + unit tests (no DOM). */

export function parseArtistTitle(fileName: string): { artistFromName?: string; titleFromName?: string } {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  const parts = base.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { artistFromName: parts[0]!.trim(), titleFromName: parts.slice(1).join(" - ").trim() };
  }
  return { titleFromName: base };
}

function readAscii(view: DataView, offset: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

export function probeWav(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Record<string, unknown> {
  const view = new DataView(buffer);
  const meta = parseArtistTitle(fileName);
  const base: Record<string, unknown> = {
    fileName,
    mimeType,
    sizeBytes,
    container: "wav",
    ...meta,
  };
  if (buffer.byteLength < 44) return base;
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") return base;

  let offset = 12;
  let sampleRate: number | undefined;
  let channels: number | undefined;
  let bitDepth: number | undefined;
  let dataSize: number | undefined;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (id === "fmt " && dataOffset + 16 <= view.byteLength) {
      channels = view.getUint16(dataOffset + 2, true);
      sampleRate = view.getUint32(dataOffset + 4, true);
      bitDepth = view.getUint16(dataOffset + 14, true);
    }
    if (id === "data") dataSize = size;
    offset = dataOffset + size + (size % 2);
  }

  let durationSeconds: number | undefined;
  if (sampleRate && channels && bitDepth && dataSize) {
    const bytesPerSample = (bitDepth / 8) * channels;
    if (bytesPerSample > 0) durationSeconds = dataSize / (sampleRate * bytesPerSample);
  }

  return { ...base, sampleRate, channels, bitDepth, durationSeconds };
}

export function probePng(buffer: ArrayBuffer): { width?: number; height?: number; format?: string } {
  const view = new DataView(buffer);
  if (buffer.byteLength < 24) return { format: "png" };
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (view.getUint8(i) !== sig[i]) return { format: "png" };
  return {
    format: "png",
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

export function probeJpeg(buffer: ArrayBuffer): { width?: number; height?: number; format?: string } {
  const view = new DataView(buffer);
  if (buffer.byteLength < 4 || view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) {
    return { format: "jpeg" };
  }
  let offset = 2;
  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2, false);
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        format: "jpeg",
        height: view.getUint16(offset + 5, false),
        width: view.getUint16(offset + 7, false),
      };
    }
    offset += 2 + size;
  }
  return { format: "jpeg" };
}

/** Build a minimal valid 44-byte silent WAV header (0 data). */
export function makeSilentWavHeader(sampleRate = 44100, channels = 2, bitDepth = 16): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * channels * bitDepth) / 8, true);
  view.setUint16(32, (channels * bitDepth) / 8, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, 0, true);
  return buffer;
}

/** Minimal 1×1 PNG */
export function makeTinyPng(): ArrayBuffer {
  // Precomputed 1x1 PNG bytes
  const bytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return bytes.buffer;
}

/**
 * Minimal MPEG-1 Layer III stream: optional ID3v2 padding + one valid frame
 * header (128 kbps, 44.1 kHz, stereo) followed by `audioBytes` of frame body.
 */
export function makeMinimalMp3(audioBytes = 16000, id3Bytes = 0): ArrayBuffer {
  const total = id3Bytes + audioBytes;
  const bytes = new Uint8Array(total);
  if (id3Bytes >= 10) {
    bytes[0] = 0x49;
    bytes[1] = 0x44;
    bytes[2] = 0x33;
    bytes[3] = 0x03;
    const payload = id3Bytes - 10;
    bytes[6] = (payload >> 21) & 0x7f;
    bytes[7] = (payload >> 14) & 0x7f;
    bytes[8] = (payload >> 7) & 0x7f;
    bytes[9] = payload & 0x7f;
  }
  bytes[id3Bytes] = 0xff;
  bytes[id3Bytes + 1] = 0xfb;
  bytes[id3Bytes + 2] = 0x90;
  bytes[id3Bytes + 3] = 0x00;
  return bytes.buffer;
}

/** Native FLAC stream head: "fLaC" + a complete STREAMINFO metadata block. */
export function makeFlacStreamInfo(
  sampleRate = 44100,
  channels = 2,
  bitDepth = 24,
  totalSamples = 44100 * 30
): ArrayBuffer {
  const bytes = new Uint8Array(4 + 4 + 34);
  bytes[0] = 0x66;
  bytes[1] = 0x4c;
  bytes[2] = 0x61;
  bytes[3] = 0x43;
  bytes[4] = 0x00;
  bytes[5] = 0x00;
  bytes[6] = 0x00;
  bytes[7] = 34;

  const b = 8;
  bytes[b] = 0x10;
  bytes[b + 1] = 0x00;
  bytes[b + 2] = 0x10;
  bytes[b + 3] = 0x00;
  bytes[b + 10] = (sampleRate >> 12) & 0xff;
  bytes[b + 11] = (sampleRate >> 4) & 0xff;
  bytes[b + 12] =
    ((sampleRate & 0x0f) << 4) | (((channels - 1) & 0x07) << 1) | (((bitDepth - 1) >> 4) & 0x01);
  bytes[b + 13] =
    (((bitDepth - 1) & 0x0f) << 4) | (Math.floor(totalSamples / 2 ** 32) & 0x0f);
  bytes[b + 14] = (totalSamples >>> 24) & 0xff;
  bytes[b + 15] = (totalSamples >>> 16) & 0xff;
  bytes[b + 16] = (totalSamples >>> 8) & 0xff;
  bytes[b + 17] = totalSamples & 0xff;
  return bytes.buffer;
}

export const probeFixtures = {
  probeWav,
  probePng,
  probeJpeg,
  makeSilentWavHeader,
  makeTinyPng,
  makeMinimalMp3,
  makeFlacStreamInfo,
  parseArtistTitle,
};
