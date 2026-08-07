/** Minimal PCM WAV decoder (PCM 16/24/32 + float32). */

export type DecodedPcm = {
  /** Downmixed mono (mean of channels) — peaks / legacy approx. */
  samples: Float32Array;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
  /** Planar channel buffers (required for BS.1770 channel weighting). */
  planar?: Float32Array[];
};

function readAscii(view: DataView, offset: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

function dbFromLinear(x: number): number {
  if (x <= 1e-12) return -120;
  return 20 * Math.log10(x);
}

export { dbFromLinear };

export function decodeWavPcm(buffer: ArrayBuffer): DecodedPcm {
  const view = new DataView(buffer);
  if (buffer.byteLength < 44) throw new Error("WAV too short");
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let audioFormat = 1;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= view.byteLength) {
      audioFormat = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataOffset = body;
      dataSize = size;
      break;
    }
    offset = body + size + (size % 2);
  }

  if (!sampleRate || !channels || dataOffset < 0) throw new Error("WAV missing fmt/data");
  if (audioFormat !== 1 && audioFormat !== 3) throw new Error(`Unsupported WAV format ${audioFormat}`);

  const bytesPerSample = bitsPerSample / 8;
  if (![1, 2, 3, 4].includes(bytesPerSample)) throw new Error(`Unsupported bit depth ${bitsPerSample}`);

  const frameCount = Math.floor(dataSize / (bytesPerSample * channels));
  const planar: Float32Array[] = Array.from({ length: channels }, () => new Float32Array(frameCount));
  const mono = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      const pos = dataOffset + (i * channels + ch) * bytesPerSample;
      let sample = 0;
      if (audioFormat === 3 && bytesPerSample === 4) {
        sample = view.getFloat32(pos, true);
      } else if (bytesPerSample === 2) {
        sample = view.getInt16(pos, true) / 32768;
      } else if (bytesPerSample === 3) {
        const b0 = view.getUint8(pos);
        const b1 = view.getUint8(pos + 1);
        const b2 = view.getUint8(pos + 2);
        let v = (b2 << 16) | (b1 << 8) | b0;
        if (v & 0x800000) v |= ~0xffffff;
        sample = v / 8388608;
      } else if (bytesPerSample === 4) {
        sample = view.getInt32(pos, true) / 2147483648;
      } else {
        sample = (view.getUint8(pos) - 128) / 128;
      }
      planar[ch]![i] = sample;
      sum += sample;
    }
    mono[i] = sum / channels;
  }

  return {
    samples: mono,
    sampleRate,
    channels,
    durationSeconds: frameCount / sampleRate,
    planar,
  };
}
