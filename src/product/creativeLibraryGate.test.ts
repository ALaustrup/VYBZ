/**
 * Creative Library gate — intake is Creative Work, not a song catalog.
 *
 * One Library. Place on your VYBZ. Image / video / file share the drop row.
 * Video is not stripped to WAV. New files default private and land in Library.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, LIVING_PROFILE } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("creative library", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("creativeLibrary");
    expect(LIVING_PROFILE.libraryIngestsUniversalWork).toBe(true);
    expect(LIVING_PROFILE.creativeWorkIsUniversal).toBe(true);
    expect(LIVING_PROFILE.oneLibrary).toBe(true);
    expect(LIVING_PROFILE.libraryToProfilePipeline).toBe(true);
    expect(LIVING_PROFILE.privateByDefaultPublicByIntent).toBe(true);
  });

  it("ingests image, video, and files without a second catalog", () => {
    const queue = read("src/features/upload/uploadQueue.ts");
    const compose = read("src/components/ComposeSheet.tsx");
    const creative = read("src/features/upload/creativeFile.ts");
    expect(creative).toContain("CREATIVE_ACCEPT");
    expect(creative).toContain("isIngestibleCreativeFile");
    expect(queue).toContain("isIngestibleCreativeFile");
    expect(queue).not.toContain("prepareUploadFile");
    expect(queue).not.toContain("Extracting audio");
    expect(compose).toContain("CREATIVE_ACCEPT");
    expect(compose).toContain("Drop files here");
    expect(compose).toContain('useState<PostAudience>("private")');
    expect(compose).toContain('navigate("/library")');
  });

  it("classifies placed drops instead of forcing audio", () => {
    const kinds = read("src/features/profile/workKind.ts");
    expect(kinds).toContain("export function classifyDrop");
    expect(kinds).toContain("export function isPlayableAudioWork");
    expect(kinds).toContain("function dropToWork");
    expect(kinds).not.toContain("function dropToAudioWork");
  });

  it("keeps Library upload and kind chips on the one catalog", () => {
    const page = read("src/pages/LibraryPage.tsx");
    const library = read("src/components/UploadsLibrary.tsx");
    const query = read("src/lib/libraryQuery.ts");
    expect(page).toContain("onCompose");
    expect(page).toContain("library-upload-header");
    expect(library).toContain("library-kind-chips");
    expect(library).toContain("library-kind-${chip.id}");
    expect(query).toContain("workKind");
    expect(read("src/App.tsx")).toContain("LibraryPage key={feedKey} onCompose=");
  });
});
