import { describe, expect, it } from "vitest";
import {
  LIBRARY_DROP_MAX_BYTES,
  collectLibraryAudioFiles,
  dragHasFiles,
} from "./libraryDropIngest";

function file(name: string, size = 1024, type = "audio/wav"): File {
  return new File([new Uint8Array(Math.min(size, 64))], name, { type });
}

describe("collectLibraryAudioFiles", () => {
  it("keeps audio and skips non-audio / empty / oversize", () => {
    const huge = file("big.wav", 64);
    Object.defineProperty(huge, "size", { value: LIBRARY_DROP_MAX_BYTES + 1 });
    const r = collectLibraryAudioFiles([
      file("a.wav"),
      file("notes.txt", 10, "text/plain"),
      file("empty.mp3", 0),
      huge,
      file("b.mp3", 32, "audio/mpeg"),
    ]);
    expect(r.files.map((f) => f.name)).toEqual(["a.wav", "b.mp3"]);
    expect(r.skippedNonAudio).toBe(1);
    expect(r.skippedEmpty).toBe(1);
    expect(r.skippedOversize).toBe(1);
  });

  it("has no batch size cap", () => {
    const many = Array.from({ length: 40 }, (_, i) => file(`t${i}.wav`));
    expect(collectLibraryAudioFiles(many).files).toHaveLength(40);
  });
});

describe("dragHasFiles", () => {
  it("detects Files type", () => {
    expect(dragHasFiles({ types: ["Files"] } as unknown as DataTransfer)).toBe(true);
    expect(dragHasFiles({ types: ["text/plain"] } as unknown as DataTransfer)).toBe(false);
    expect(dragHasFiles(null)).toBe(false);
  });
});
