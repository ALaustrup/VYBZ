import { describe, expect, it } from "vitest";
import { isSafeRelativePath, safeRelativePath } from "@/features/assetNode/safePath";
import { buildLocalIndex, shouldIndexDir } from "@/features/assetNode/indexFolder";
import { fileAtRelativePath } from "@/features/assetNode/walkHandle";

describe("safeRelativePath", () => {
  it("keeps ordinary catalog paths and rejects traversal", () => {
    expect(safeRelativePath("Samples/Imported/kick.wav")).toBe("Samples/Imported/kick.wav");
    expect(safeRelativePath("C:/Windows/x.wav")).toBeNull();
    expect(safeRelativePath("/etc/passwd")).toBeNull();
    expect(safeRelativePath("../secret.wav")).toBeNull();
    expect(safeRelativePath("stems/../../secret.wav")).toBeNull();
    expect(safeRelativePath("foo/./bar.wav")).toBeNull();
    expect(isSafeRelativePath("Song.als")).toBe(true);
  });

  it("drops traversal entries from the local catalog", () => {
    const { assets } = buildLocalIndex("Desk", [
      { relativePath: "ok.wav", name: "ok.wav", sizeBytes: 4, mime: "audio/wav", lastModified: 1 },
      { relativePath: "../escape.wav", name: "escape.wav", sizeBytes: 4, mime: "audio/wav", lastModified: 1 },
    ]);
    expect(assets.map((a) => a.relativePath)).toEqual(["ok.wav"]);
    expect(shouldIndexDir("..")).toBe(false);
  });

  it("does not walk parent directories when opening a local file", async () => {
    const calls: string[] = [];
    const root = {
      async getDirectoryHandle(name: string) {
        calls.push(name);
        return this;
      },
      async getFileHandle() {
        throw new Error("should not open");
      },
    } as unknown as FileSystemDirectoryHandle;
    expect(await fileAtRelativePath(root, "../secret.wav")).toBeNull();
    expect(calls).toEqual([]);
  });
});
