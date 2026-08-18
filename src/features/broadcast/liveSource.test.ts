import { describe, expect, it } from "vitest";
import {
  dawIngestPatch,
  isCheckViolation,
  isMusicSource,
  legacyDawFallback,
  persistableLiveSource,
  resolveLiveSource,
} from "./liveSource";

describe("liveSource mapping", () => {
  it("persists daw as daw after migration 0104", () => {
    expect(persistableLiveSource("daw")).toBe("daw");
    expect(persistableLiveSource("camera")).toBe("camera");
    expect(persistableLiveSource("both")).toBe("both");
  });

  it("keeps a monetization ingest flag so pre-0104 rows still resolve", () => {
    expect(dawIngestPatch("daw")).toEqual({ ingest: "daw" });
    expect(dawIngestPatch("display")).toEqual({});
  });

  it("falls back to display + ingest when the old CHECK is still live", () => {
    expect(legacyDawFallback("daw")).toEqual({
      source: "display",
      input_mode: "display",
      monetization: { ingest: "daw" },
    });
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

  it("detects a Postgres check-violation so Go Live can retry", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
    expect(isCheckViolation({ message: 'new row violates check constraint "live_sessions_source_check"' })).toBe(true);
    expect(isCheckViolation({ code: "23505", message: "duplicate" })).toBe(false);
  });
});
