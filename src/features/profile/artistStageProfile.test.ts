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
    expect(ARTIST_STAGE_PROFILE.notArtistOnly).toBe(true);
    expect(ARTIST_STAGE_PROFILE.moreThanAudio).toBe(true);
    expect(ARTIST_STAGE_PROFILE.extensibleWorkRenderer).toBe(true);
    expect(LIVE_MIX_STREAMING.publicStageFile).toBe(true);
  });

  it("writes the Stage File into PRODUCT", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Version 8");
    expect(product).toContain("0007");
    expect(product).toContain("Stage File");
    expect(product).toContain("Connect is a request");
  });

  it("leads with live nights and keeps connect as a request", () => {
    const page = read("src/pages/UserProfilePage.tsx");
    expect(page).toContain("ArtistStageProfile");
    expect(page).toContain("listHostStageNights");
    expect(page).toContain("listProfileProjects");
    expect(page).toContain('roleLabel || "Creator"');
    const ui = read("src/features/profile/ArtistStageProfile.tsx");
    expect(ui).toContain("On the stage");
    expect(ui).toContain("Works");
    expect(ui).toContain("WorkCard");
    expect(ui).toContain("collectStageWorks");
    expect(ui).toContain("SessionProvenanceBadge");
    expect(ui).toContain("Book a session");
    expect(ui).toContain("this is not a calendar");
    expect(ui).toContain("profile-connect");
    expect(ui).toContain("Request sent");
    expect(ui).toContain("No live nights yet");
    expect(ui).toContain("TipButton");
    expect(ui).not.toMatch(/Followers|Human certified|AI-free/i);
    expect(ui).not.toMatch(/No live mixes yet|Join live mix/);
    const kinds = read("src/features/profile/workKind.ts");
    expect(kinds).toContain('"audio"');
    expect(kinds).toContain('"image"');
    expect(kinds).toContain('"video"');
    expect(kinds).toContain('"file"');
    expect(kinds).toContain('"project"');
    expect(kinds).toContain('"link"');
    const card = read("src/features/profile/WorkCard.tsx");
    expect(card).toContain("WORK_RENDERERS");
    expect(card).toContain('kind === "audio"');
    expect(card).toContain('kind === "image"');
    expect(card).toContain('kind === "video"');
    expect(card).toContain('kind === "file"');
    expect(card).toContain('kind === "project"');
    expect(card).toContain('kind === "link"');
    expect(card).toContain("TrackCard");
  });
});
