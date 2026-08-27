/**
 * Living Profile Phase 2C — D2 route transition.
 * Signed-in `/` is people-first social landing; owner Stage File at `/u/:id`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, LIVING_PROFILE } from "@/product/invariants";
import { HOME_ITEM, ownerProfilePath } from "@/shell/navModel";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("living profile phase 2C — social home route", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("livingProfilePhase2c");
  });

  it("locks social landing at / and owner profile at /u/:id", () => {
    expect(LIVING_PROFILE.loggedInHomeIsSocialLanding).toBe(true);
    expect(LIVING_PROFILE.ownerStageFileAtPublicRoute).toBe(true);
  });

  it("routes signed-in home to SocialHomePage, not MyVybzHome", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('path="/" element={<SocialHomePage');
    expect(app).toContain('path="/feed" element={<Navigate to="/" replace />}');
    expect(app).not.toMatch(/path="\/" element=\{<MyVybzHome/);
    expect(read("src/pages/SocialHomePage.tsx")).toContain("FeedPage");
    expect(read("src/pages/SocialHomePage.tsx")).toContain("My VYBZ");
    expect(read("src/pages/UserProfilePage.tsx")).toContain("export function MyVybzHome");
  });

  it("points rail Home at / and My VYBZ at owner profile path", () => {
    expect(HOME_ITEM.path).toBe("/");
    expect(HOME_ITEM.label).toBe("Home");
    expect(HOME_ITEM.hint).toBe("People & live");
    expect(ownerProfilePath("abc")).toBe("/u/abc");
    const menu = read("src/components/shell/AccountMenu.tsx");
    expect(menu).toContain("ownerProfilePath");
    expect(menu).toContain("My VYBZ");
    expect(read("src/pages/FeedPage.tsx")).toContain("SocialRoomsPanel");
    expect(read("src/components/home/SocialRoomsPanel.tsx")).toContain("listSocialRooms");
  });
});
