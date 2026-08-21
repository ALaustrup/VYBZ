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

  it("locks any-host live audio as a capability, not a sample-pack or music-only shop", () => {
    expect(LIVE_AUDIO.liveAudioIsACapability).toBe(true);
    expect(LIVE_AUDIO.hostsAreNotMusicOnly).toBe(true);
    expect(LIVE_AUDIO.talkPodcastAndMusicAreFirstClass).toBe(true);
    expect(LIVE_AUDIO.airtimeIsOnlyHostingClock).toBe(true);
    expect(LIVE_AUDIO.screenWindowIsFirstHostPath).toBe(true);
    expect(LIVE_AUDIO.audioOnlyReusesLivekit).toBe(true);
    expect(LIVE_MIX_STREAMING.hostingRequiresAtc).toBe(true);
    expect(LIVE_MIX_STREAMING.liveMixIsFirstClassSurface).toBe(true);
    expect(ARTIST_STAGE_PROFILE.notArtistOnly).toBe(true);
    expect(PRINCIPLES.moneyFollowsTheSessionNotTheClock).toBe(true);
    expect(PRINCIPLES.viewpointNeutralHosting).toBe(true);
    expect(PROHIBITIONS.payingForClockOrRank).toBe(true);
    expect(PROHIBITIONS.ticketedEventsInThisLock).toBe(false);
  });

  it("writes the lock into PRODUCT", () => {
    const product = readFileSync(path.join(ROOT, "PRODUCT.md"), "utf8");
    expect(product).toContain("Version 8");
    expect(product).toContain("0009");
    expect(product).toContain("Not a sample-pack app");
    expect(product).toContain("Not music-only");
    expect(product).toContain("Money follows the session, never the clock");
    expect(product).toContain("viewpoint-neutral");
    expect(product).toContain("Ticketed events stay out of this lock");
    expect(product).toContain("LiveKit");
    expect(product).toContain("screen/window");
  });

  it("puts Go Live and any-host copy on the live front door", () => {
    const live = readFileSync(path.join(ROOT, "src/pages/LivePage.tsx"), "utf8");
    expect(live).toContain("Go live");
    expect(live).toContain("Who's live");
    expect(live).toContain("WhosLivePanel");
    expect(live).toContain("Listening is free");
    expect(live).toContain("Stay to earn Airtime");
    expect(live).toContain("Talk");
    expect(live).toContain("Music");
    expect(live).not.toMatch(/Produce & Stream Live/);
    expect(live).not.toMatch(/Start Live Mix/);
    expect(live).not.toMatch(/Live Mix Radio/);
    const nav = readFileSync(path.join(ROOT, "src/shell/navModel.ts"), "utf8");
    expect(nav).toContain('"/live"');
    expect(nav).not.toMatch(/label: "Live Mix"/);
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    expect(app).toContain('path="/live"');
    const stage = readFileSync(path.join(ROOT, "src/features/profile/ArtistStageProfile.tsx"), "utf8");
    expect(stage).toContain("Go live");
    const go = readFileSync(path.join(ROOT, "src/components/GoLiveSheet.tsx"), "utf8");
    expect(go).toContain("Talk");
    expect(go).toContain("Podcast");
    expect(go).toContain("Vent");
    expect(go).toContain("HOST_SOURCE_TABS");
    expect(go).toContain("DEFAULT_HOST_SOURCE");
    expect(go).toContain("getDisplayMedia");
    expect(go).toContain('source === "audio"');
    expect(go).not.toMatch(/TURN ready|Bunny Stream ready/);
    const watch = readFileSync(path.join(ROOT, "src/pages/LiveWatchPage.tsx"), "utf8");
    expect(watch).toContain("TipButton");
    expect(watch).toContain("Back to Live");
    expect(watch).toContain("joinLiveSessionSfu");
    expect(watch).toContain("LiveVisualizer");
    expect(watch).toContain("hostSource: session.source");
    expect(watch).not.toMatch(/Back to Live Mix|Connecting to live mix|producer's studio/);
    const profile = readFileSync(path.join(ROOT, "src/features/profile/ArtistStageProfile.tsx"), "utf8");
    expect(profile).toContain("TipButton");
    expect(profile).toContain("No live nights yet");
    expect(profile).not.toMatch(/No live mixes yet|Join live mix/);
  });
});
