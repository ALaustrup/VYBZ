import { describe, expect, it } from "vitest";
import {
  classifyFile,
  isDocumentFile,
  isImageFile,
  isIngestibleCreativeFile,
} from "./creativeFile";

function file(name: string, type: string): File {
  return new File([new Uint8Array(1)], name, { type });
}

describe("creative file ingest", () => {
  it("accepts audio, image, video, and allowed documents", () => {
    expect(isIngestibleCreativeFile(file("take.wav", "audio/wav"))).toBe(true);
    expect(isIngestibleCreativeFile(file("still.png", "image/png"))).toBe(true);
    expect(isIngestibleCreativeFile(file("cut.mp4", "video/mp4"))).toBe(true);
    expect(isIngestibleCreativeFile(file("notes.pdf", "application/pdf"))).toBe(true);
    expect(isIngestibleCreativeFile(file("pack.zip", "application/zip"))).toBe(true);
    expect(isIngestibleCreativeFile(file("payload.exe", "application/x-msdownload"))).toBe(false);
  });

  it("classifies by MIME and extension", () => {
    expect(classifyFile(file("still.png", "image/png"))).toBe("image");
    expect(classifyFile(file("cut.mp4", "video/mp4"))).toBe("video");
    expect(classifyFile(file("mix.flac", "audio/flac"))).toBe("audio");
    expect(classifyFile(file("press.pdf", "application/pdf"))).toBe("file");
    expect(isImageFile(file("art.webp", ""))).toBe(true);
    expect(isDocumentFile(file("press.pdf", ""))).toBe(true);
  });
});
