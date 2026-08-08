import { describe, expect, it } from "vitest";
import {
  METADATA_DRAFT_FORMAT,
  emptyMetadataDraft,
  parseMetadataDraftJson,
  serializeMetadataDraft,
} from "./metadataDraft";

describe("metadataDraft JSON", () => {
  it("round-trips a draft envelope", () => {
    const draft = { ...emptyMetadataDraft(), title: "Song", artist: "Artist", isrc: "USRC17607839" };
    const raw = serializeMetadataDraft(draft);
    expect(raw).toContain(METADATA_DRAFT_FORMAT);
    expect(parseMetadataDraftJson(raw)).toEqual(draft);
  });

  it("rejects unknown formats", () => {
    expect(() => parseMetadataDraftJson(JSON.stringify({ format: "other", draft: {} }))).toThrow(
      /Invalid/
    );
  });
});
