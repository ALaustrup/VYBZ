import { describe, expect, it } from "vitest";
import { inferMetadataLocal, METADATA_FIXTURE, METADATA_PROC_VERSION } from "@vybz/processing/metadata";

describe("Metadata suggestions", () => {
  it("matches golden fixture JSON", () => {
    const got = inferMetadataLocal({ fixture: true });
    expect(got).toEqual(METADATA_FIXTURE);
    expect(got.procVersion).toBe(METADATA_PROC_VERSION);
    expect(got).toMatchInlineSnapshot(`
      {
        "genre": "Electronic",
        "mood": "Upbeat",
        "procVersion": "metadata.2",
        "source": "fixture",
      }
    `);
  });

  it("reports unavailable rather than guessing when offline", () => {
    const got = inferMetadataLocal({ title: "Night Drive", artist: "Astra" });
    expect(got.source).toBe("unavailable");
    expect(got.genre).toBeNull();
    expect(got.mood).toBeNull();
  });

  it("never derives a suggestion from the input text", () => {
    const a = inferMetadataLocal({ title: "Night Drive", artist: "Astra" });
    const b = inferMetadataLocal({ title: "Completely Different", artist: "Someone Else" });
    expect(a).toEqual(b);
  });

  it("exposes no tempo, key, ISRC or confidence field", () => {
    const keys = Object.keys(inferMetadataLocal({ fixture: true }));
    for (const banned of ["bpm", "key", "isrc", "isrcSuggestion", "confidence"]) {
      expect(keys).not.toContain(banned);
    }
  });
});
