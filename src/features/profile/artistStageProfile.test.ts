import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("artist stage profile", () => {
  it("leads with live nights and keeps connect as a request", () => {
    const page = read("src/pages/UserProfilePage.tsx");
    expect(page).toContain("ArtistStageProfile");
    expect(page).toContain("listHostStageNights");
    const ui = read("src/features/profile/ArtistStageProfile.tsx");
    expect(ui).toContain("On the stage");
    expect(ui).toContain("SessionProvenanceBadge");
    expect(ui).toContain("Book a session");
    expect(ui).toContain("profile-connect");
    expect(ui).toContain("Request sent");
    expect(ui).not.toMatch(/Followers|Human certified|AI-free/i);
  });
});
