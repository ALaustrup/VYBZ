/**
 * Creator OS hardening — first slice on Asset Node, Follow, provenance, and CSP.
 * Not a completed audit of WebRTC, chat, or media parsing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATOR_OS_HARDENING,
  GATE_REGISTRY,
  HUMAN_PROVENANCE,
  CREATOR_NETWORK,
} from "@/product/invariants";
import { navItems } from "@/shell/navModel";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("creator OS hardening", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("creatorOsHarden");
  });

  it("locks confinement without claiming a finished audit", () => {
    expect(CREATOR_OS_HARDENING.assetPathsStayInsideAuthorizedFolder).toBe(true);
    expect(CREATOR_OS_HARDENING.cloudMetadataHasNoFileBytes).toBe(true);
    expect(CREATOR_OS_HARDENING.transportReusesExistingCsp).toBe(true);
    expect(CREATOR_OS_HARDENING.followHasNoPublicCount).toBe(true);
    expect(CREATOR_OS_HARDENING.provenanceIsAssociationNotAuthorship).toBe(true);
    expect(CREATOR_OS_HARDENING.hardeningIsNotACompletedAudit).toBe(true);
    expect(HUMAN_PROVENANCE.refusesNotAiClaim).toBe(true);
    expect(CREATOR_NETWORK.noPublicFollowerCounts).toBe(true);
  });

  it("does not add Devices nav", () => {
    expect(navItems().map((i) => i.path)).not.toContain("/devices");
  });

  it("confines Asset Node paths and reuses existing transport headers", () => {
    const walk = read("src/features/assetNode/walkHandle.ts");
    const safe = read("src/features/assetNode/safePath.ts");
    const cloud = read("src/features/assetNode/cloudSync.ts");
    const ui = read("src/components/library/LocalAssetsLibrary.tsx");
    const csp = read("vercel.json");
    const follows = read("supabase/migrations/20260821_0113_creator_follows.sql");
    const pathMig = read("supabase/migrations/20260821_0115_indexed_asset_path_confine.sql");
    const product = read("PRODUCT.md");

    expect(safe).toContain("safeRelativePath");
    expect(safe).toContain('part === ".."');
    expect(walk).toContain("safeRelativePath");
    expect(walk).toContain("if (!safe) return null");
    expect(cloud).toContain("isSafeRelativePath");
    expect(cloud).toContain("Never uploads file bytes");
    expect(ui).not.toContain("dangerouslySetInnerHTML");
    expect(csp).toContain("Content-Security-Policy");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(follows).toContain("revoke all on public.creator_follows from anon, public");
    expect(follows).toContain("Do not expose a public follower count");
    expect(pathMig).toContain("indexed_assets_relative_path_confined");
    expect(pathMig).not.toContain("local_path");
    expect(product).toContain("Relative paths must stay inside the authorized folder");
    expect(product).toContain("not a completed security audit");
  });
});
