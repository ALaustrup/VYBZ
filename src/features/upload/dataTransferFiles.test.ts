/**
 * Folder drops. `dataTransfer.files` is empty for a directory, so these cover
 * the entry walk that actually reaches the tracks inside one.
 */
import { describe, expect, it } from "vitest";
import {
  entriesFromDataTransfer,
  filesFromDataTransfer,
  MAX_DROPPED_FILES,
} from "@/features/upload/dataTransferFiles";

function file(name: string): File {
  return new File([new Uint8Array(1)], name, { type: "audio/wav" });
}

function fileEntry(name: string) {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (ok: (f: File) => void) => ok(file(name)),
  };
}

/** readEntries yields a page then an empty page, exactly like the real reader. */
function dirEntry(name: string, children: unknown[]) {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader() {
      let done = false;
      return {
        readEntries(ok: (e: unknown[]) => void) {
          if (done) return ok([]);
          done = true;
          ok(children);
        },
      };
    },
  };
}

function transfer(entries: unknown[], files: File[] = []): DataTransfer {
  return {
    items: entries.map((entry) => ({ kind: "file", webkitGetAsEntry: () => entry })),
    files,
  } as unknown as DataTransfer;
}

describe("filesFromDataTransfer", () => {
  it("reaches the tracks inside a dropped folder", async () => {
    const dt = transfer([dirEntry("Album", [fileEntry("01.wav"), fileEntry("02.wav")])]);
    const files = await filesFromDataTransfer(dt);
    expect(files.map((f) => f.name)).toEqual(["01.wav", "02.wav"]);
  });

  it("walks nested folders, which is how discs are laid out", async () => {
    const dt = transfer([
      dirEntry("Album", [
        dirEntry("Disc 1", [fileEntry("a.wav")]),
        dirEntry("Disc 2", [fileEntry("b.wav")]),
      ]),
    ]);
    const files = await filesFromDataTransfer(dt);
    expect(files.map((f) => f.name).sort()).toEqual(["a.wav", "b.wav"]);
  });

  it("orders by path so an album arrives in its own order", async () => {
    const dt = transfer([
      dirEntry("Album", [fileEntry("10.wav"), fileEntry("2.wav"), fileEntry("1.wav")]),
    ]);
    const files = await filesFromDataTransfer(dt);
    // Numeric collation: 2 before 10, which plain string sort gets wrong.
    expect(files.map((f) => f.name)).toEqual(["1.wav", "2.wav", "10.wav"]);
  });

  it("ignores dotfiles and macOS sidecars", async () => {
    const dt = transfer([
      dirEntry("Album", [fileEntry(".DS_Store"), fileEntry("._track.wav"), fileEntry("real.wav")]),
    ]);
    const files = await filesFromDataTransfer(dt);
    expect(files.map((f) => f.name)).toEqual(["real.wav"]);
  });

  it("stops rather than hanging when someone drops a drive", async () => {
    const many = Array.from({ length: MAX_DROPPED_FILES + 50 }, (_, i) => fileEntry(`t${i}.wav`));
    const files = await filesFromDataTransfer(transfer([dirEntry("Huge", many)]));
    expect(files.length).toBeLessThanOrEqual(MAX_DROPPED_FILES);
    expect(files.length).toBeGreaterThan(0);
  });

  it("still takes plain files when the entry API is absent", async () => {
    const dt = { files: [file("loose.wav")] } as unknown as DataTransfer;
    const files = await filesFromDataTransfer(dt);
    expect(files.map((f) => f.name)).toEqual(["loose.wav"]);
  });

  it("falls back rather than swallowing a drop that read nothing", async () => {
    const dt = transfer([dirEntry("Empty", [])], [file("loose.wav")]);
    const files = await filesFromDataTransfer(dt);
    expect(files.map((f) => f.name)).toEqual(["loose.wav"]);
  });

  it("collects entries synchronously, before the item list is emptied", () => {
    // The real DataTransferItemList is neutered once the handler yields, so the
    // collection step must not be async.
    const dt = transfer([fileEntry("a.wav"), fileEntry("b.wav")]);
    expect(entriesFromDataTransfer(dt)).toHaveLength(2);
  });

  it("treats an empty drop as empty rather than throwing", async () => {
    expect(await filesFromDataTransfer(null)).toEqual([]);
  });
});
