import { describe, expect, it } from "vitest";
import { walkAuthorizedFolder } from "@/features/assetNode/walkHandle";

function fileHandle(name: string, hang = false): FileSystemFileHandle {
  return {
    kind: "file",
    name,
    async getFile() {
      if (hang) return new Promise<File>(() => undefined);
      return new File(["x"], name, { lastModified: 1 });
    },
  } as FileSystemFileHandle;
}

function dirHandle(
  name: string,
  kids: FileSystemHandle[],
  mode: "entries" | "values" | "none" = "entries",
): FileSystemDirectoryHandle {
  const dir = {
    kind: "directory",
    name,
    async *entries() {
      for (const kid of kids) yield [kid.name, kid] as [string, FileSystemHandle];
    },
    async *values() {
      for (const kid of kids) yield kid;
    },
  } as unknown as FileSystemDirectoryHandle;
  if (mode === "values") delete (dir as { entries?: unknown }).entries;
  if (mode === "none") {
    delete (dir as { entries?: unknown }).entries;
    delete (dir as { values?: unknown }).values;
  }
  return dir;
}

describe("walkAuthorizedFolder", () => {
  it("catalogs names without calling getFile", async () => {
    let reads = 0;
    const hung = fileHandle("online-only.wav", true);
    const original = hung.getFile.bind(hung);
    hung.getFile = async () => {
      reads += 1;
      return original();
    };
    const root = dirHandle("Song Project", [
      fileHandle("Song.als"),
      hung,
      dirHandle("Backup", [fileHandle("Song [2026].als")]),
    ]);
    const walked = await walkAuthorizedFolder(root);
    expect(reads).toBe(0);
    expect(walked.files.map((f) => f.name).sort()).toEqual(["Song.als", "online-only.wav"]);
    expect(walked.files.every((f) => f.sizeBytes === 0)).toBe(true);
    expect(walked.skipped).toBeGreaterThan(0);
  });

  it("falls back to values() when entries() is missing", async () => {
    const root = dirHandle("Phone", [fileHandle("take.m4a")], "values");
    const walked = await walkAuthorizedFolder(root);
    expect(walked.files).toHaveLength(1);
    expect(walked.files[0]?.name).toBe("take.m4a");
  });

  it("throws when the directory cannot be listed", async () => {
    const root = dirHandle("Empty", [], "none");
    await expect(walkAuthorizedFolder(root)).rejects.toThrow(/not listable/);
  });
});
