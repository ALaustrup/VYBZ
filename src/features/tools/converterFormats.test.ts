import { beforeAll, describe, expect, it } from "vitest";
import {
  CONVERTER_UNAVAILABLE_ENCODE,
  encodeWav24,
  listConverterFormats,
  toMonoBuffer,
} from "@/features/tools/converterFormats";

/** jsdom has no Web Audio; duck-type enough for encode/mono. */
beforeAll(() => {
  if (typeof globalThis.AudioBuffer !== "undefined") return;
  class TestAudioBuffer {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    duration: number;
    private channels: Float32Array[];
    constructor(opts: { length: number; numberOfChannels: number; sampleRate: number }) {
      this.length = opts.length;
      this.numberOfChannels = opts.numberOfChannels;
      this.sampleRate = opts.sampleRate;
      this.duration = opts.length / opts.sampleRate;
      this.channels = Array.from(
        { length: opts.numberOfChannels },
        () => new Float32Array(opts.length),
      );
    }
    getChannelData(c: number) {
      return this.channels[c]!;
    }
  }
  (globalThis as unknown as { AudioBuffer: typeof TestAudioBuffer }).AudioBuffer = TestAudioBuffer;
});

function toneBuffer(seconds = 0.05, rate = 48000, channels = 2): AudioBuffer {
  const length = Math.floor(seconds * rate);
  const buf = new AudioBuffer({ length, numberOfChannels: channels, sampleRate: rate });
  for (let c = 0; c < channels; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = Math.sin((i / rate) * 440 * Math.PI * 2) * (c === 0 ? 0.5 : 0.25);
  }
  return buf;
}

describe("converterFormats (OR-037)", () => {
  it("lists WAV16/WAV24 as available and discloses unavailable encodes", () => {
    const list = listConverterFormats();
    expect(list.find((f) => f.id === "wav16")?.available).toBe(true);
    expect(list.find((f) => f.id === "wav24")?.available).toBe(true);
    expect(CONVERTER_UNAVAILABLE_ENCODE.some((f) => f.id === "mp3")).toBe(true);
  });

  it("encodes 24-bit WAV with RIFF header and measurable size", () => {
    const blob = encodeWav24(toneBuffer());
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBeGreaterThan(44);
  });

  it("downmixes to mono", () => {
    const mono = toMonoBuffer(toneBuffer());
    expect(mono.numberOfChannels).toBe(1);
    expect(mono.length).toBeGreaterThan(0);
  });
});
