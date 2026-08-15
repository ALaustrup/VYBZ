/**
 * OR-038 Pack Maker ← Library → Store gate.
 * Law 1: samples only from fetched Library audio or user drops; no invented inventory;
 * pack working set never auto-createDrop.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { PACK_MAKER_VERSION } from "@/features/packs/packManifest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-038 Pack Maker Library → Store", () => {
  it("ships Library picker + assemble-from-blob + storefront ZIP handoff upload", () => {
    const page = read("src/features/packs/PackMakerPage.tsx");
    const assemble = read("src/features/packs/packAssemble.ts");
    const editor = read("src/pages/StorefrontEditorPage.tsx");
    expect(assemble).toContain("assembleSampleFromBlob");
    expect(page).toContain("assembleSampleFromBlob");
    expect(page).toContain('data-testid="pack-library-picker"');
    expect(page).toContain('data-testid="pack-library-add"');
    expect(page).toContain("dropsBy");
    expect(page).toMatch(/never auto-added to Library|never auto-ingested into Library/i);
    expect(page).not.toMatch(/createDrop\(/);
    expect(editor).toContain("uploadStorefrontZip");
    expect(editor).toContain("takePackHandoff");
    expect(editor).toMatch(/Pack Maker ZIP uploaded|handoff\.objectUrl/);
  });

  it("bumps pack assemble version for OR-038", () => {
    expect(PACK_MAKER_VERSION).toMatch(/^or038\./);
  });

  it("keeps Market free of invented inventory claims in Pack Maker", () => {
    const page = read("src/features/packs/PackMakerPage.tsx");
    expect(page).not.toMatch(/guaranteed placement|DSP delivery|invented inventory/i);
  });

  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or038PackMakerLibrary");
  });
});
