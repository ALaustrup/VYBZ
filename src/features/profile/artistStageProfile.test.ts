import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARTIST_STAGE_PROFILE,
  GATE_REGISTRY,
  LIVE_MIX_STREAMING,
} from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("artist stage profile", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("artistStageProfile");
  });

  it("locks the Stage File rules", () => {
    expect(ARTIST_STAGE_PROFILE.liveNightsLead).toBe(true);
    expect(ARTIST_STAGE_PROFILE.connectIsARequest).toBe(true);
    expect(ARTIST_STAGE_PROFILE.bookIsAMessageNotACalendar).toBe(true);
    expect(ARTIST_STAGE_PROFILE.measuredStatsOnly).toBe(true);
    expect(ARTIST_STAGE_PROFILE.noVanityFollowerCounts).toBe(true);
    expect(ARTIST_STAGE_PROFILE.sessionSealNotHumanCertified).toBe(true);
    expect(ARTIST_STAGE_PROFILE.routeStaysResolvable).toBe(true);
    expect(LIVE_MIX_STREAMING.publicStageFile).toBe(true);
  });

  it("writes the Stage File into PRODUCT", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Version 6");
    expect(product).toContain("0007");
    expect(product).toContain("Stage File");
    expect(product).toContain("Connect is a request");
  });

  it("leads with live nights and keeps connect as a request", () => {
    const page = read("src/pages/UserProfilePage.tsx");
    expect(page).toContain("ArtistStageProfile");
    expect(page).toContain("listHostStageNights");
    const ui = read("src/features/profile/ArtistStageProfile.tsx");
    expect(ui).toContain("On the stage");
    expect(ui).toContain("SessionProvenanceBadge");
    expect(ui).toContain("Book a session");
    expect(ui).toContain("this is not a calendar");
    expect(ui).toContain("profile-connect");
    expect(ui).toContain("Request sent");
    expect(ui).not.toMatch(/Followers|Human certified|AI-free/i);
  });
});
