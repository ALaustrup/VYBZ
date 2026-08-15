/**
 * OR-037 Converter formats gate — WAV16/WAV24/Opus-WebM with Law 1 honesty
 * (no fake MP3/AAC/FLAC encode claims).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import {
  CONVERTER_UNAVAILABLE_ENCODE,
  encodeWav24,
  listConverterFormats,
} from "@/features/tools/converterFormats";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

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

function toneBuffer(seconds = 0.02, rate = 48000): AudioBuffer {
  const length = Math.floor(seconds * rate);
  const buf = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: rate });
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.sin((i / rate) * 440 * Math.PI * 2) * 0.3;
  return buf;
}

describe("OR-037 Converter formats", () => {
  it("ships format matrix, WAV24 encode, and unavailable disclosure", () => {
    const page = read("src/features/tools/MediaConverterPage.tsx");
    const formats = read("src/features/tools/converterFormats.ts");
    expect(formats).toContain("encodeWav24");
    expect(formats).toContain("encodeOpusWebm");
    expect(formats).toContain("CONVERTER_UNAVAILABLE_ENCODE");
    expect(page).toContain('data-testid="converter-format-matrix"');
    expect(page).toContain('data-testid="converter-unavailable"');
    expect(page).toContain("encodeWav24");
    expect(page).toContain("listConverterFormats");
    expect(page).toMatch(/never fake MP3|no MP3 encoder|Browsers have no MP3/i);
    expect(page).not.toMatch(/encode to MP3|export as MP3|AAC encode available/i);
  });

  it("lists honest available formats and refuses claimed MP3 encode", () => {
    const list = listConverterFormats();
    expect(list.find((f) => f.id === "wav16")?.available).toBe(true);
    expect(list.find((f) => f.id === "wav24")?.available).toBe(true);
    expect(CONVERTER_UNAVAILABLE_ENCODE.map((f) => f.id)).toEqual(
      expect.arrayContaining(["mp3", "aac", "flac"]),
    );
    const blob = encodeWav24(toneBuffer());
    expect(blob.size).toBeGreaterThan(44);
  });

  it("routes Media Converter in the suite", () => {
    const apps = read("src/shell/suiteApps.ts");
    const app = read("src/App.tsx");
    expect(apps).toMatch(/converter|media-converter|\/tools\/convert/i);
    expect(app).toContain("MediaConverterPage");
  });

  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or037ConverterFormats");
  });
});
