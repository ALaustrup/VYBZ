/**
 * Local Asset Node gate — originals stay on the creator's device.
 * Indexing is not publishing. No Devices nav until a real node exists.
 * Cloud metadata tables stay unapplied until the owner authorizes a migration.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_OS, GATE_REGISTRY, PRINCIPLES } from "@/product/invariants";
import { navItems } from "@/shell/navModel";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("local asset node", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("assetNode");
  });

  it("locks indexing as not publishing and originals as local-first", () => {
    expect(CREATOR_OS.indexingIsNotPublishing).toBe(true);
    expect(PRINCIPLES.originalsStayLocalByDefault).toBe(true);
  });

  it("does not add a Devices destination before the node exists in chrome", () => {
    expect(navItems().map((i) => i.path)).not.toContain("/devices");
  });

  it("indexes through the Platform Bridge without uploading", () => {
    const walk = read("src/features/assetNode/walkHandle.ts");
    const index = read("src/features/assetNode/indexFolder.ts");
    const store = read("src/features/assetNode/store.ts");
    const ui = read("src/components/library/LocalAssetsLibrary.tsx");
    const web = read("src/platform/bridge/web.ts");
    const desktop = read("src/platform/bridge/desktop.ts");
    const page = read("src/pages/LibraryPage.tsx");

    expect(web).toContain("showDirectoryPicker");
    expect(desktop).not.toContain("Tauri command pending Phase 2.D");
    expect(desktop).toContain("web.files.selectFolder");
    expect(page).toContain("library-tab-device");
    expect(page).toContain("This device");
    expect(ui).toContain("Indexing is not publishing");
    expect(ui).toContain("Not published");
    expect(store).toContain("Unindex only. Does not delete files on disk.");

    for (const src of [walk, index, store, ui]) {
      expect(src).not.toContain("@/lib/api");
      expect(src).not.toContain("supabase");
      expect(src).not.toContain("audio-assets");
      expect(src).not.toMatch(/storage\.from\(/);
    }
    expect(walk).not.toContain(".arrayBuffer(");
    expect(walk).not.toContain("sha256");
    expect(index).toContain("Does not upload, hash, or copy bytes");
  });
});
