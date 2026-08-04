import { describe, expect, it } from "vitest";
import { probeContainer, probeFlac, probeMp3, probeFixtures } from "@vybz/processing/readiness";

const { makeMinimalMp3, makeFlacStreamInfo, makeSilentWavHeader } = probeFixtures;

describe("probeMp3", () => {
  it("reads sample rate, channels and bitrate from the first frame header", () => {
    const buf = makeMinimalMp3(16000);
    const probe = probeMp3(buf, buf.byteLength);
    expect(probe.container).toBe("mp3");
    expect(probe.sampleRate).toBe(44100);
    expect(probe.channels).toBe(2);
    expect(probe.bitrateKbps).toBe(128);
    expect(probe.codecProfile).toBe("MPEG-1 Layer III");
  });

  it("derives CBR duration from audio bytes and flags it as estimated", () => {
    const audioBytes = 16000;
    const buf = makeMinimalMp3(audioBytes);
    const probe = probeMp3(buf, buf.byteLength);
    expect(probe.bitrateMode).toBe("cbr");
    expect(probe.durationEstimated).toBe(true);
    expect(probe.durationSeconds).toBeCloseTo((audioBytes * 8) / 128000, 6);
  });

  it("skips an ID3v2 tag before locating the frame sync", () => {
    const buf = makeMinimalMp3(16000, 2048);
    const probe = probeMp3(buf, buf.byteLength);
    expect(probe.sampleRate).toBe(44100);
    // ID3 bytes are excluded from the audio payload used for duration.
    expect(probe.durationSeconds).toBeCloseTo((16000 * 8) / 128000, 6);
  });

  it("omits every field when no valid frame header exists", () => {
    const probe = probeMp3(new Uint8Array(512).buffer, 512);
    expect(probe).toEqual({ container: "mp3" });
    expect(probe.sampleRate).toBeUndefined();
    expect(probe.durationSeconds).toBeUndefined();
  });
});

describe("probeFlac", () => {
  it("reads STREAMINFO sample rate, channels, bit depth and exact duration", () => {
    const buf = makeFlacStreamInfo(48000, 2, 24, 48000 * 90);
    const probe = probeFlac(buf);
    expect(probe.container).toBe("flac");
    expect(probe.sampleRate).toBe(48000);
    expect(probe.channels).toBe(2);
    expect(probe.bitDepth).toBe(24);
    expect(probe.durationSeconds).toBeCloseTo(90, 6);
    expect(probe.durationEstimated).toBeUndefined();
  });

  it("handles high sample rates and mono", () => {
    const probe = probeFlac(makeFlacStreamInfo(96000, 1, 16, 96000 * 10));
    expect(probe.sampleRate).toBe(96000);
    expect(probe.channels).toBe(1);
    expect(probe.bitDepth).toBe(16);
    expect(probe.durationSeconds).toBeCloseTo(10, 6);
  });

  it("leaves duration unset when the encoder declared no length", () => {
    const probe = probeFlac(makeFlacStreamInfo(44100, 2, 16, 0));
    expect(probe.sampleRate).toBe(44100);
    expect(probe.durationSeconds).toBeUndefined();
  });

  it("returns container only when the magic does not match", () => {
    expect(probeFlac(makeSilentWavHeader())).toEqual({ container: "flac" });
  });
});

describe("probeContainer", () => {
  it("routes by extension", () => {
    const mp3 = makeMinimalMp3(8000);
    expect(probeContainer(mp3, "Track.mp3", "", mp3.byteLength)?.container).toBe("mp3");
    expect(probeContainer(makeFlacStreamInfo(), "Track.flac", "")?.container).toBe("flac");
  });

  it("routes by MIME when the extension is absent", () => {
    const mp3 = makeMinimalMp3(8000);
    expect(probeContainer(mp3, "track", "audio/mpeg", mp3.byteLength)?.container).toBe("mp3");
  });

  it("returns null for containers it cannot parse", () => {
    expect(probeContainer(makeSilentWavHeader(), "Track.wav", "audio/wav")).toBeNull();
    expect(probeContainer(new ArrayBuffer(16), "Track.ogg", "audio/ogg")).toBeNull();
  });
});
