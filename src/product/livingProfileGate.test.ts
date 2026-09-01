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
    expect(LIVING_PROFILE.libraryIngestsUniversalWork).toBe(true);
    expect(LIVING_PROFILE.libraryIsMediaGallery).toBe(true);
    expect(LIVING_PROFILE.toolsServeWork).toBe(true);
    expect(LIVING_PROFILE.customizationWithoutScriptInjection).toBe(true);
    expect(LIVING_PROFILE.privateByDefaultPublicByIntent).toBe(true);
    expect(LIVING_PROFILE.socialSignalsInformNotManipulate).toBe(true);
    expect(LIVING_PROFILE.quieterInterfaceAsPowerGrows).toBe(true);
    expect(LIVING_PROFILE.noGenericDashboard).toBe(true);
    expect(LIVING_PROFILE.loggedInHomeIsSocialLanding).toBe(true);
    expect(LIVING_PROFILE.ownerStageFileAtPublicRoute).toBe(true);
    expect(LIVING_PROFILE.defaultChromeIsQuiet).toBe(true);
    expect(LIVING_PROFILE.oneAlertsChrome).toBe(true);
    expect(LIVING_PROFILE.dashboardIsOwnerStageFile).toBe(true);
    expect(LIVING_PROFILE.desktopPrimaryRail).toBe(false);
    expect(LIVING_PROFILE.mobileNavDrawer).toBe(true);
    expect(LIVING_PROFILE.chromeIsMenuOnly).toBe(true);
    expect(LIVING_PROFILE.chromeControlsLiveInDrawer).toBe(true);
    expect(LIVING_PROFILE.ownerVisitorDualMode).toBe(true);
    expect(LIVING_PROFILE.profileModuleRegistry).toBe(true);
    expect(LIVING_PROFILE.libraryToProfilePipeline).toBe(true);
    expect(LIVING_PROFILE.profileModularArrangement).toBe(true);
    expect(LIVING_PROFILE.profileSectionHide).toBe(true);
    expect(LIVING_PROFILE.everyExperienceHasAnEquivalent).toBe(true);
    expect(LIVING_PROFILE.profileOwnerAmbientAttention).toBe(true);
    expect(LIVING_PROFILE.liveIsProfilePresence).toBe(true);
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
    expect(product).toContain("Logged-in home is the people-first social landing");
    expect(product).toContain("Search, +, Chat, Alerts, and Me live in the drawer");
    expect(product).toContain("Alerts appears once");
    expect(product).toContain("That Stage File is the owner dashboard");
    expect(product).toContain("Chat is Chat. Alerts is Alerts");
    expect(product).not.toContain("Owner sees Library, Workspace, Go live");
    expect(product).not.toContain("Logged-in home remains Workspace until Phase 1");
    expect(product).toContain("View as Visitor");
    expect(product).toContain("module registry");
    expect(product).toContain("text, and collection");
    expect(product).toContain("Place on your VYBZ");
    expect(product).toContain("audio, image, video, or a file");
    expect(product).toContain("Library is a media gallery");
    expect(product).toContain("Sound starts on tap");
    expect(product).toContain("one bar of kinds and tools");
    expect(product).toContain("Arrange");
    expect(product).toContain("hide existing");
    expect(product).not.toContain("Owner vs visitor dual-mode polish is later than this lock");
    expect(product).not.toContain("creative operating environment with a social layer built into it");
    expect(product).not.toMatch(/VYBZ is the Creator Operating System\./);
  });

  it("puts signed-in home on the people-first social landing", () => {
    expect(HOME_ITEM.path).toBe("/");
    expect(HOME_ITEM.label).toBe("Home");
    expect(HOME_ITEM.hint).toBe("People & live");
    const app = read("src/App.tsx");
    expect(app).toContain('path="/" element={<SocialHomePage');
    expect(app).toContain('path="/u/:id" element={<UserProfilePage />}');
    expect(read("src/pages/SocialHomePage.tsx")).toContain("export function SocialHomePage");
    expect(read("src/pages/UserProfilePage.tsx")).toContain("export function MyVybzHome");
    expect(app).toContain('path="/workspace" element={<WorkspaceGateway');
    expect(app).toContain("ownerProfilePath");
    expect(read("src/pages/ProfilePage.tsx")).toContain("export function ProfilePage");
  });

  it("mounts desktop PrimaryRail and mobile nav drawer without duplicating kingdom chrome", () => {
    const shell = read("src/shell/SuiteShell.tsx");
    const bar = read("src/components/shell/ContextualAppBar.tsx");
    const drawer = read("src/shell/ShellNavDrawer.tsx");
    const chrome = read("src/components/shell/DrawerChrome.tsx");
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    expect(read("src/shell/PrimaryRail.tsx")).toContain("export function PrimaryRail");
    expect(shell).not.toMatch(/<PrimaryRail\s*\/>/);
    expect(shell).toContain("<ShellNavDrawer");
    expect(shell).not.toMatch(/<SuiteAppRail\s*\/>/);
    expect(bar).toContain("openShellNavDrawer");
    expect(bar).toContain("shell-nav-menu");
    expect(bar).not.toContain("<PeopleMenu />");
    expect(bar).not.toContain("<ChatIndicator />");
    expect(bar).not.toContain("<AlertsMenu />");
    expect(bar).not.toContain("<AccountMenu />");
    expect(bar).not.toContain("suite-app-bar-mark");
    expect(chrome).toContain("openCommandPalette");
    expect(chrome).toContain("Search VYBZ");
    expect(chrome).toContain("<ChatIndicator />");
    expect(chrome).toContain("<AlertsMenu />");
    expect(chrome).toContain("<AccountMenu />");
    expect(chrome).toContain('aria-label="Add"');
    expect(drawer).toContain("DrawerChrome");
    expect(read("src/shell/RailIdentity.tsx")).not.toContain("rail-notify-button");
    expect(read("src/components/vdock/VDockSocialStrip.tsx")).not.toContain("/notifications");
    expect(read("src/components/shell/PeopleMenu.tsx")).toContain("export function PeopleMenu");
    expect(read("src/components/shell/PeopleMenu.tsx")).toContain("openCommandPalette");
    expect(read("src/components/shell/AccountMenu.tsx")).toContain('aria-label="Me"');
    expect(stage).toContain('navigate("/library")');
    expect(stage).not.toContain('navigate("/workspace")');
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

  it("routes Stage File works through the module registry", () => {
    const kinds = read("src/features/profile/workKind.ts");
    const card = read("src/features/profile/WorkCard.tsx");
    const stage = read("src/features/profile/ArtistStageProfile.tsx");
    expect(kinds).toContain('"text"');
    expect(kinds).toContain('"collection"');
    expect(card).toContain("MODULE_RENDERERS");
    expect(card).toContain("rendererFor");
    expect(card).toContain("UnknownWork");
    expect(stage).toContain("WorkCard");
    expect(stage).toContain("collectStageWorks");
    expect(stage).toContain("playlists:");
  });

  it("places Library work on the Stage File without a second catalog", () => {
    expect(read("src/features/profile/stageComposition.ts")).toContain("placeDrops");
    expect(read("src/features/profile/PlaceOnVybzSheet.tsx")).toContain("Place on your VYBZ");
    expect(read("src/pages/UserProfilePage.tsx")).toContain("applyDropComposition");
    expect(read("src/lib/libraryQuery.ts")).toContain('"cinema"');
    expect(read("src/lib/libraryQuery.ts")).toContain('"shelves"');
    expect(read("src/components/library/LibraryToolbar.tsx")).toContain('id: "cinema"');
    expect(read("src/components/library/LibraryToolbar.tsx")).toContain('id: "shelves"');
  });

  it("lets the owner rearrange existing Stage File modules", () => {
    expect(read("src/features/profile/stageLayout.ts")).toContain("STAGE_MODULE_IDS");
    expect(read("src/features/profile/stageLayout.ts")).toContain("parseStageModuleOrder");
    expect(read("src/features/profile/placeOnVybz.ts")).toContain("persistStageModuleOrder");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("profile-arrange-modules");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("Arrange");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("Featured");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).not.toMatch(/dangerouslySetInnerHTML|contenteditable/i);
  });

  it("lets the owner hide existing sections from the public VYBZ", () => {
    expect(read("src/features/profile/stageLayout.ts")).toContain("parseStageHiddenModules");
    expect(read("src/features/profile/stageLayout.ts")).toContain("toggleHiddenModule");
    expect(read("src/features/profile/placeOnVybz.ts")).toContain("persistStageHiddenModules");
    expect(read("src/features/profile/StageModuleFrame.tsx")).toContain("Hide");
    expect(read("src/features/profile/StageModuleFrame.tsx")).toContain("Show");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).toContain("commitHidden");
    expect(read("src/features/profile/ArtistStageProfile.tsx")).not.toMatch(/dangerouslySetInnerHTML|contenteditable/i);
  });

  it("orients agents at the Living Profile identity", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain(
      "living social identity that becomes a creative operating system when you create",
    );
  });
});
