import { describe, expect, it } from "vitest";
import { probeFixtures } from "@vybz/processing/readiness";

describe("readiness probe fixtures", () => {
  it("reads wav sample rate from header", () => {
    const buf = probeFixtures.makeSilentWavHeader(48000, 2, 24);
    const probe = probeFixtures.probeWav(buf, "Artist - Track.wav", "audio/wav", buf.byteLength);
    expect(probe.sampleRate).toBe(48000);
    expect(probe.channels).toBe(2);
    expect(probe.bitDepth).toBe(24);
    expect(probe.artistFromName).toBe("Artist");
    expect(probe.titleFromName).toBe("Track");
  });

  it("reads png dimensions", () => {
    const buf = probeFixtures.makeTinyPng();
    const probe = probeFixtures.probePng(buf);
    expect(probe.width).toBe(1);
    expect(probe.height).toBe(1);
    expect(probe.format).toBe("png");
  });
});
