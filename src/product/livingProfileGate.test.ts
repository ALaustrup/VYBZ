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
    expect(LIVING_PROFILE.defaultChromeIsQuiet).toBe(true);
    expect(LIVING_PROFILE.ownerVisitorDualMode).toBe(true);
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
    expect(product).toContain("VYBZ · Search · + · Chat · Alerts · Me");
    expect(product).not.toContain("Logged-in home remains Workspace until Phase 1");
    expect(product).toContain("View as Visitor");
    expect(product).not.toContain("Owner vs visitor dual-mode polish is later than this lock");
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

  it("collapses permanent navigation into quiet chrome", () => {
    const shell = read("src/shell/SuiteShell.tsx");
    const bar = read("src/components/shell/ContextualAppBar.tsx");
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    expect(shell).not.toMatch(/<PrimaryRail\s*\/>/);
    expect(shell).toContain("PrimaryRail stays in the tree");
    expect(bar).toContain("openCommandPalette");
    expect(bar).toContain("Search VYBZ");
    expect(bar).not.toContain("<PeopleMenu />");
    expect(bar).toContain("<ChatIndicator />");
    expect(bar).toContain("<AlertsMenu />");
    expect(bar).toContain("<AccountMenu />");
    expect(bar).toContain('aria-label="Add"');
    expect(bar).toContain('aria-label="VYBZ"');
    expect(read("src/components/shell/PeopleMenu.tsx")).toContain("export function PeopleMenu");
    expect(read("src/components/shell/PeopleMenu.tsx")).toContain("openCommandPalette");
    expect(read("src/components/shell/AccountMenu.tsx")).toContain('aria-label="Me"');
    expect(stage).toContain('navigate("/library")');
    expect(stage).toContain('navigate("/workspace")');
    expect(stage).toContain("Go live");
  });

  it("keeps one Stage File with owner controls, visitor experience, and View as Visitor", () => {
    const page = read("src/pages/UserProfilePage.tsx");
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    const perspective = read("src/features/profile/perspective.ts");
    expect(page).toContain("previewAsVisitor");
    expect(page).toContain("isVisitorPreview");
    expect(page).toContain("setVisitorPreview");
    expect(stage).toContain("profile-view-as-visitor");
    expect(stage).toContain("profile-visitor-preview");
    expect(stage).toContain("View as visitor");
    expect(stage).toContain("showOwnerControls");
    expect(stage).toContain("showVisitorSocial");
    expect(perspective).toContain("profilePerspective");
    expect(perspective).toContain("never on your own VYBZ");
  });

  it("orients agents at the Living Profile identity", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain(
      "living social identity that becomes a creative operating system when you create",
    );
  });
});
