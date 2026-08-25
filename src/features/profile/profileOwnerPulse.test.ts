import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, LIVING_PROFILE } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("living profile phase 2 — owner pulse", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("livingProfilePhase2");
  });

  it("locks every experience has an equivalent and owner ambient attention", () => {
    expect(LIVING_PROFILE.everyExperienceHasAnEquivalent).toBe(true);
    expect(LIVING_PROFILE.profileOwnerAmbientAttention).toBe(true);
  });

  it("mounts ProfileOwnerPulse on the owner Stage File only", () => {
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    expect(stage).toContain("ProfileOwnerPulse");
    expect(stage).toContain("{ownerUi && !previewAsVisitor ? <ProfileOwnerPulse");
    expect(read("src/features/profile/ProfileOwnerPulse.tsx")).toContain('aria-label="Needs your attention"');
  });

  it("exposes Open public VYBZ from the identity menu without competing with home", () => {
    const menu = read("src/components/shell/AccountMenu.tsx");
    expect(menu).toContain("Open public VYBZ");
    expect(menu).toMatch(/\/u\/\$\{userId\}/);
    expect(menu).toContain('navigate("/")');
  });
});
