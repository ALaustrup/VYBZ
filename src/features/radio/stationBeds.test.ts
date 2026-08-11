import { describe, expect, it } from "vitest";
import { STATION_GREETING, STATION_INTERSTITIAL, resolveStationUrl } from "@/features/radio/stationBeds";
import {
  computeRadioPositionSec,
  resetVibesRadioClient,
  type VibesRadioSync,
} from "@/features/radio/vibesRadio";

describe("stationBeds", () => {
  it("uses measured durations for both beds", () => {
    expect(STATION_GREETING.durationSec).toBe(9.125);
    expect(STATION_INTERSTITIAL.durationSec).toBe(7.875);
  });

  it("resolves relative paths against origin", () => {
    expect(resolveStationUrl("/audio/2.wav", "https://vybz.cloud")).toBe(
      "https://vybz.cloud/audio/2.wav",
    );
  });
});

describe("computeRadioPositionSec", () => {
  it("clamps to duration from server startedAt", () => {
    resetVibesRadioClient();
    const sync: VibesRadioSync = {
      trackId: "t1",
      kind: "interstitial",
      startedAt: new Date(Date.now() - 3000).toISOString(),
      serverNow: new Date().toISOString(),
      durationSec: 7.875,
      positionSec: 3,
      title: "Hear something new",
      artist: "VYBZ",
      audioUrl: "/audio/2.wav",
      dropId: null,
      guestSafe: true,
      metadata: { format: "wav", durationSec: 7.875 },
    };
    const pos = computeRadioPositionSec(sync);
    expect(pos).toBeGreaterThanOrEqual(2.5);
    expect(pos).toBeLessThanOrEqual(4);
  });
});
