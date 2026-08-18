import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARTIST_STAGE_PROFILE,
  GATE_REGISTRY,
  LIVE_AUDIO,
  LIVE_MIX_STREAMING,
  PRINCIPLES,
  PROHIBITIONS,
} from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../..");

describe("live audio lock", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("liveAudio");
  });

  it("locks any-host live audio, not a sample-pack or music-only shop", () => {
    expect(LIVE_AUDIO.liveAudioIsTheProduct).toBe(true);
    expect(LIVE_AUDIO.hostsAreNotMusicOnly).toBe(true);
    expect(LIVE_AUDIO.talkPodcastAndMusicAreFirstClass).toBe(true);
    expect(LIVE_AUDIO.airtimeIsOnlyHostingClock).toBe(true);
    expect(LIVE_MIX_STREAMING.hostingRequiresAtc).toBe(true);
    expect(ARTIST_STAGE_PROFILE.notArtistOnly).toBe(true);
    expect(PRINCIPLES.moneyFollowsTheSessionNotTheClock).toBe(true);
    expect(PRINCIPLES.viewpointNeutralHosting).toBe(true);
    expect(PROHIBITIONS.payingForClockOrRank).toBe(true);
    expect(PROHIBITIONS.ticketedEventsInThisLock).toBe(false);
  });

  it("writes the lock into PRODUCT", () => {
    const product = readFileSync(path.join(ROOT, "PRODUCT.md"), "utf8");
    expect(product).toContain("Version 7");
    expect(product).toContain("0009");
    expect(product).toContain("real-time live audio platform");
    expect(product).toContain("Not a sample-pack app");
    expect(product).toContain("Not music-only");
    expect(product).toContain("Money follows the session, never the clock");
    expect(product).toContain("viewpoint-neutral");
    expect(product).toContain("Ticketed events stay out of this lock");
  });
});
