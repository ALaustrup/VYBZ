import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_ITEM } from "@/shell/navModel";
import {
  CREATOR_OS,
  GATE_REGISTRY,
  LIVING_PROFILE,
  PRINCIPLES,
} from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("living profile constitution", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("livingProfile");
  });

  it("locks One Identity, One Library, Profile Is Product, Community First, Refine Before Replace", () => {
    expect(LIVING_PROFILE.oneIdentity).toBe(true);
    expect(LIVING_PROFILE.oneLibrary).toBe(true);
    expect(LIVING_PROFILE.profileIsTheProduct).toBe(true);
    expect(LIVING_PROFILE.communityFirst).toBe(true);
    expect(LIVING_PROFILE.refineBeforeReplace).toBe(true);
    expect(LIVING_PROFILE.noForcedCreatorOnboarding).toBe(true);
    expect(LIVING_PROFILE.creationIsOptional).toBe(true);
    expect(LIVING_PROFILE.oneProfileTwoPerspectives).toBe(true);
    expect(LIVING_PROFILE.creativeWorkIsUniversal).toBe(true);
    expect(LIVING_PROFILE.toolsServeWork).toBe(true);
    expect(LIVING_PROFILE.customizationWithoutScriptInjection).toBe(true);
    expect(LIVING_PROFILE.privateByDefaultPublicByIntent).toBe(true);
    expect(LIVING_PROFILE.socialSignalsInformNotManipulate).toBe(true);
    expect(LIVING_PROFILE.quieterInterfaceAsPowerGrows).toBe(true);
    expect(LIVING_PROFILE.noGenericDashboard).toBe(true);
    expect(LIVING_PROFILE.loggedInHomeIsMyVybz).toBe(true);
    expect(CREATOR_OS.creatorOsIsTheProduct).toBe(false);
    expect(CREATOR_OS.livingProfileBecomesCreatorOs).toBe(true);
    expect(PRINCIPLES.hideNeverDelete).toBe(true);
  });

  it("writes the Living Profile identity into PRODUCT", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Version 9");
    expect(product).toContain("0011");
    expect(product).toContain(
      "VYBZ is a living social identity that becomes a creative operating system when you create",
    );
    expect(product).toContain(
      "social identity environment whose living profile becomes a creative operating system",
    );
    expect(product).toContain("One Identity");
    expect(product).toContain("One Library");
    expect(product).toContain("Profile Is The Product");
    expect(product).toContain("Community First");
    expect(product).toContain("Refine before replacing");
    expect(product).toContain("ARE YOU A CREATOR?");
    expect(product).toContain("Logged-in home is My VYBZ");
    expect(product).not.toContain("Logged-in home remains Workspace until Phase 1");
    expect(product).not.toContain("creative operating environment with a social layer built into it");
    expect(product).not.toMatch(/VYBZ is the Creator Operating System\./);
  });

  it("puts signed-in home on the existing Stage File", () => {
    expect(HOME_ITEM.path).toBe("/");
    expect(HOME_ITEM.label).toBe("Me");
    expect(HOME_ITEM.hint).toBe("Your VYBZ");
    const app = read("src/App.tsx");
    expect(app).toContain('path="/" element={<MyVybzHome />}');
    expect(app).toContain('path="/workspace" element={<ProfilePage />}');
    expect(app).toContain('path="/u/:id" element={<UserProfilePage />}');
    expect(read("src/pages/UserProfilePage.tsx")).toContain("export function MyVybzHome");
    expect(read("src/pages/ProfilePage.tsx")).toContain("export function ProfilePage");
  });

  it("orients agents at the Living Profile identity", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain(
      "living social identity that becomes a creative operating system when you create",
    );
  });
});
