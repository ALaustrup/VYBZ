import { describe, expect, it } from "vitest";
import { WORK_SESSION_CLAIM } from "@/product/invariants";
import {
  attestWorkSessions,
  canValidateHumanity,
  linksForAsset,
  linksForProject,
} from "./workAttestation";

describe("work session attestation", () => {
  it("is owner-only and needs a stored file", () => {
    expect(canValidateHumanity({ isOwner: true, hasAsset: true, online: true }).ok).toBe(true);
    expect(canValidateHumanity({ isOwner: false, hasAsset: true, online: true }).ok).toBe(false);
    expect(canValidateHumanity({ isOwner: true, hasAsset: false, online: true }).reason).toMatch(/stored file/i);
    expect(canValidateHumanity({ isOwner: true, hasAsset: true, online: false }).reason).toMatch(/offline/i);
  });

  it("uses the defensible sentence and refuses a not-AI claim", () => {
    const none = attestWorkSessions([]);
    expect(none.associated).toBe(false);
    expect(none.claim).toBeNull();
    const some = attestWorkSessions([
      { liveSessionId: "s1", assetId: "a1", projectId: null, strength: "full", sealedAt: "2026-08-21", atcBurned: 12 },
    ]);
    expect(some.associated).toBe(true);
    expect(some.claim).toBe(WORK_SESSION_CLAIM);
    expect(some.claim).toBe("This file is associated with verified VYBZ creation sessions.");
    expect(some.strength).toBe("full");
    expect(some.refusal).toMatch(/not AI-generated/);
    expect(some.claim).not.toMatch(/mathematically proves|Human certified/i);
  });

  it("filters links by work asset or project", () => {
    const links = [
      { liveSessionId: "s1", assetId: "a1", projectId: "p1", strength: "thin" as const, sealedAt: null, atcBurned: 0 },
      { liveSessionId: "s2", assetId: "a2", projectId: null, strength: "full" as const, sealedAt: null, atcBurned: 8 },
    ];
    expect(linksForAsset(links, "a1").map((l) => l.liveSessionId)).toEqual(["s1"]);
    expect(linksForProject(links, "p1").map((l) => l.liveSessionId)).toEqual(["s1"]);
    expect(linksForAsset(links, null)).toEqual([]);
  });
});
