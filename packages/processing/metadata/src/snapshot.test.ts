import { describe, expect, it } from "vitest";
import { inferMetadataLocal, METADATA_FIXTURE, METADATA_PROC_VERSION } from "@vybz/processing/metadata";

describe("Metadata AI fixture snapshot", () => {
  it("matches golden fixture JSON", () => {
    const got = inferMetadataLocal({ fixture: true });
    expect(got).toEqual(METADATA_FIXTURE);
    expect(got.procVersion).toBe(METADATA_PROC_VERSION);
    expect(got).toMatchInlineSnapshot(`
      {
        "bpm": 122,
        "confidence": 0.82,
        "genre": "Electronic",
        "isrcSuggestion": "QZVYZ2500001",
        "mood": "Upbeat",
        "procVersion": "phase15.metadata.1",
        "source": "fixture",
      }
    `);
  });

  it("heuristic is deterministic for same input", () => {
    const a = inferMetadataLocal({ title: "Night Drive", artist: "Astra" });
    const b = inferMetadataLocal({ title: "Night Drive", artist: "Astra" });
    expect(a).toEqual(b);
    expect(a.source).toBe("heuristic");
  });
});
