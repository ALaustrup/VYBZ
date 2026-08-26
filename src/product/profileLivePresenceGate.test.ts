import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, LIVING_PROFILE } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("profile live presence (Phase 2B)", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("livingProfilePhase2b");
    expect(LIVING_PROFILE.liveIsProfilePresence).toBe(true);
  });

  it("embeds live playback in the Profile banner without a second player graph", () => {
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    const liveStage = read("src/features/profile/ProfileLiveStage.tsx");
    const hook = read("src/features/profile/useProfileLivePlayback.ts");

    expect(stage).toContain("ProfileLiveStage");
    expect(stage).toContain("ProfileLiveStickyBar");
    expect(stage).not.toContain('aria-label="Join live"');
    expect(stage).not.toContain("absolute inset-0 z-[1]");
    expect(liveStage).toContain('id="profile-live-stage"');
    expect(liveStage).toContain("useProfileLivePlayback");
    expect(hook).toContain("canPublish");
    expect(hook).toContain("takeLivePreviewHandoff");
    expect(hook).not.toContain("MusicDockPlayer");
    expect(hook).not.toContain("playTrack");
  });

  it("exposes semantic live state for owner and visitor", () => {
    const liveStage = read("src/features/profile/ProfileLiveStage.tsx");
    const sticky = read("src/features/profile/ProfileLiveStickyBar.tsx");
    const stage = read("src/features/profile/ArtistStageProfile.tsx");

    expect(liveStage).toContain("Your VYBZ is live");
    expect(liveStage).toContain("is live");
    expect(liveStage).toContain("Live video stream");
    expect(liveStage).toContain("Live audio stream");
    expect(liveStage).toContain('aria-label="Manage live session"');
    expect(liveStage).toContain("Manage live");
    expect(sticky).toContain("Return to live");
    expect(stage).toContain("Live session playing");
    expect(stage).toContain("Return to live");
  });

  it("keeps live out of ProfileOwnerPulse once the banner carries presence", () => {
    const pulse = read("src/features/profile/ProfileOwnerPulse.tsx");
    expect(pulse).not.toContain("You are live");
    expect(pulse).not.toContain("liveNow");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("<ProfileOwnerPulse />");
  });

  it("preserves visitor preview, Hide/Arrange, and non-live banner", () => {
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    expect(stage).toContain("profile-visitor-preview");
    expect(stage).toContain("profile-arrange-modules");
    expect(stage).toContain("commitHidden");
    expect(stage).toContain("onSessionEnded");
    expect(stage).toContain("liveBannerDismissed");
    expect(stage).toContain("h-[38vh]");
  });

  it("routes full-session chat and host controls through existing /live", () => {
    const liveStage = read("src/features/profile/ProfileLiveStage.tsx");
    expect(liveStage).toContain('to={`/live/${night.id}`}');
    expect(read("src/App.tsx")).toContain('path="/live/:id" element={<LiveWatchPage />}');
    expect(read("src/pages/LiveWatchPage.tsx")).toContain("joinLiveSessionSfu");
  });
});
