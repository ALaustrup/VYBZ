import { describe, expect, it } from "vitest";
import {
  buildLocalIndex,
  isAudioAsset,
  MAX_INDEXED_FILES,
  mimeFromName,
  shouldIndexDir,
  shouldIndexFile,
} from "@/features/assetNode/indexFolder";
import { AVAILABILITY_LABEL } from "@/features/assetNode/types";
import { listAssets, listNodes, removeNode, resetMemoryCatalog, saveIndex } from "@/features/assetNode/store";

describe("local asset node index", () => {
  it("catalogs metadata as local-only and does not invent a public URL", () => {
    const { node, assets } = buildLocalIndex(
      "Sessions",
      [
        { relativePath: "vocal.wav", name: "vocal.wav", sizeBytes: 2048, mime: "audio/wav", lastModified: 1 },
        { relativePath: "backup/skip.wav", name: "skip.wav", sizeBytes: 10, mime: "audio/wav", lastModified: 1 },
      ],
      1_700_000_000_000,
      (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    );
    expect(node.name).toBe("Sessions");
    expect(node.availability).toBe("local-only");
    expect(assets).toHaveLength(2);
    expect(assets.every((a) => a.availability === "local-only")).toBe(true);
    expect(JSON.stringify({ node, assets })).not.toMatch(/https?:\/\//);
    expect(JSON.stringify({ node, assets })).not.toContain("audio-assets");
  });

  it("caps the catalog and skips junk paths", () => {
    const files = Array.from({ length: MAX_INDEXED_FILES + 25 }, (_, i) => ({
      relativePath: `clip-${i}.wav`,
      name: `clip-${i}.wav`,
      sizeBytes: 8,
      mime: "audio/wav",
      lastModified: i,
    }));
    const { node, assets } = buildLocalIndex("Huge", files);
    expect(assets).toHaveLength(MAX_INDEXED_FILES);
    expect(node.fileCount).toBe(MAX_INDEXED_FILES);
    expect(shouldIndexDir("Backup")).toBe(false);
    expect(shouldIndexDir("Stems")).toBe(true);
    expect(shouldIndexFile("Thumbs.db")).toBe(false);
    expect(shouldIndexFile("master.wav")).toBe(true);
  });

  it("treats audio by mime or extension", () => {
    expect(isAudioAsset("audio/wav", "x.bin")).toBe(true);
    expect(isAudioAsset("application/octet-stream", "loop.flac")).toBe(true);
    expect(isAudioAsset("image/png", "art.png")).toBe(false);
    expect(mimeFromName("cover.png")).toBe("image/png");
  });

  it("unindexes without implying a disk delete", async () => {
    resetMemoryCatalog();
    const { node, assets } = buildLocalIndex("Desk", [
      { relativePath: "a.wav", name: "a.wav", sizeBytes: 4, mime: "audio/wav", lastModified: 1 },
    ]);
    await saveIndex(node, assets);
    expect((await listNodes()).map((n) => n.id)).toContain(node.id);
    expect((await listAssets()).length).toBeGreaterThan(0);
    await removeNode(node.id);
    expect((await listNodes()).find((n) => n.id === node.id)).toBeUndefined();
    expect((await listAssets()).filter((a) => a.nodeId === node.id)).toHaveLength(0);
  });

  it("labels availability honestly", () => {
    expect(AVAILABILITY_LABEL["local-only"]).toBe("Local only");
    expect(AVAILABILITY_LABEL["device-offline"]).toBe("Device offline");
  });
});
