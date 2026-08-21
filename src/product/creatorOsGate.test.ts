import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_ITEM, navGroups, navItems } from "@/shell/navModel";
import {
  CREATOR_OS,
  GATE_REGISTRY,
  HUMAN_PROVENANCE,
  LIVE_AUDIO,
  LIVE_MIX_STREAMING,
  LIVING_PROFILE,
  PRINCIPLES,
} from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../..");

describe("creator operating system lock", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("creatorOs");
  });

  it("locks Creator OS as what the living profile becomes, with live as a capability", () => {
    expect(CREATOR_OS.creatorOsIsTheProduct).toBe(false);
    expect(CREATOR_OS.livingProfileBecomesCreatorOs).toBe(true);
    expect(LIVING_PROFILE.profileIsTheProduct).toBe(true);
    expect(CREATOR_OS.workIsTheUnit).toBe(true);
    expect(CREATOR_OS.musicIsASpecialization).toBe(true);
    expect(CREATOR_OS.indexingIsNotPublishing).toBe(true);
    expect(CREATOR_OS.mobileDoesNotClaimPersistentHosting).toBe(true);
    expect(CREATOR_OS.refusesAbsoluteHumanAuthorshipClaim).toBe(true);
    expect(CREATOR_OS.noRewriteToPivot).toBe(true);
    expect(CREATOR_OS.zeroIncrementalRecurringCostPreferred).toBe(true);
    expect(PRINCIPLES.originalsStayLocalByDefault).toBe(true);
    expect(PRINCIPLES.hideNeverDelete).toBe(true);
    expect(LIVE_AUDIO.liveAudioIsACapability).toBe(true);
    expect(LIVE_MIX_STREAMING.liveMixIsPrimary).toBe(false);
    expect(LIVE_MIX_STREAMING.liveMixIsFirstClassSurface).toBe(true);
    expect(HUMAN_PROVENANCE.refusesNotAiClaim).toBe(true);
  });

  it("writes Creator OS as a capability into PRODUCT", () => {
    const product = readFileSync(path.join(ROOT, "PRODUCT.md"), "utf8");
    expect(product).toContain("Version 8");
    expect(product).toContain("0010");
    expect(product).toContain("Creator Operating System");
    expect(product).toContain("Creative Work");
    expect(product).toContain("Not a sample-pack app");
    expect(product).toContain("Not music-only");
    expect(product).toContain("Indexing is not publishing");
    expect(product).not.toMatch(/VYBZ is a real-time live audio platform/);
    expect(product).not.toContain("liveAudioIsTheProduct");
  });

  it("keeps transitional chrome as Workspace, Library, Live, and Network until Phase 1", () => {
    expect(HOME_ITEM.label).toBe("Workspace");
    expect(HOME_ITEM.path).toBe("/");
    const items = navItems();
    expect(items.find((i) => i.path === "/library")?.label).toBe("Library");
    expect(items.find((i) => i.path === "/library")?.hint).toBe("Your works");
    expect(items.find((i) => i.path === "/live")?.label).toBe("Live");
    expect(items.find((i) => i.path === "/feed")?.label).toBe("Network");
    expect(navGroups().map((g) => g.id)).toEqual(["work", "network"]);
    expect(items.map((i) => i.path)).toEqual(["/", "/library", "/feed", "/live"]);
    expect(items.map((i) => i.path)).not.toContain("/devices");
  });
});
