import { describe, expect, it } from "vitest";
import { dawIngestPatch, isMusicSource, persistableLiveSource, resolveLiveSource } from "./liveSource";

describe("liveSource mapping", () => {
  it("never persists daw into the constrained source column", () => {
    expect(persistableLiveSource("daw")).toBe("display");
    expect(persistableLiveSource("camera")).toBe("camera");
    expect(persistableLiveSource("both")).toBe("both");
  });

  it("marks daw ingest only in monetization", () => {
    expect(dawIngestPatch("daw")).toEqual({ ingest: "daw" });
    expect(dawIngestPatch("display")).toEqual({});
  });

  it("resolves daw from native source or monetization ingest", () => {
    expect(resolveLiveSource("daw")).toBe("daw");
    expect(resolveLiveSource("display", { ingest: "daw" })).toBe("daw");
    expect(resolveLiveSource("display", { tip_goal: 10 })).toBe("display");
    expect(resolveLiveSource("nope")).toBe("camera");
  });

  it("treats daw as a music source for discovery filters", () => {
    expect(isMusicSource("daw")).toBe(true);
    expect(isMusicSource("display")).toBe(true);
    expect(isMusicSource("camera")).toBe(false);
  });
});
