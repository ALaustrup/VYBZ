import { describe, expect, it } from "vitest";
import {
  audioModeForSource,
  dawIngestPatch,
  DEFAULT_HOST_SOURCE,
  HOST_SOURCE_TABS,
  isCheckViolation,
  isMusicSource,
  legacyDawFallback,
  livekitPublishSourceKind,
  persistableLiveSource,
  resolveLiveSource,
  sourceIngestPatch,
} from "./liveSource";

describe("liveSource mapping", () => {
  it("leads Go Live with screen/window, then audio", () => {
    expect(DEFAULT_HOST_SOURCE).toBe("display");
    expect(HOST_SOURCE_TABS.map((t) => t.id)).toEqual(["display", "audio", "camera", "both", "daw"]);
    expect(HOST_SOURCE_TABS[0]?.label).toBe("Screen");
    expect(HOST_SOURCE_TABS[1]?.label).toBe("Audio");
  });

  it("persists daw as daw after migration 0104", () => {
    expect(persistableLiveSource("daw")).toBe("daw");
    expect(persistableLiveSource("camera")).toBe("camera");
    expect(persistableLiveSource("both")).toBe("both");
  });

  it("persists audio as camera plus ingest so the existing CHECK holds", () => {
    expect(persistableLiveSource("audio")).toBe("camera");
    expect(sourceIngestPatch("audio")).toEqual({ ingest: "audio" });
    expect(resolveLiveSource("camera", { ingest: "audio" })).toBe("audio");
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
    expect(isMusicSource("audio")).toBe(false);
  });

  it("uses speech mode for audio-only and camera talk", () => {
    expect(audioModeForSource("display")).toBe("music");
    expect(audioModeForSource("audio")).toBe("speech");
    expect(audioModeForSource("camera")).toBe("speech");
  });

  it("publishes screen tracks as screen share on LiveKit", () => {
    expect(livekitPublishSourceKind("video", "display")).toBe("screen_share");
    expect(livekitPublishSourceKind("audio", "display")).toBe("screen_share_audio");
    expect(livekitPublishSourceKind("video", "both")).toBe("screen_share");
    expect(livekitPublishSourceKind("audio", "audio")).toBe("microphone");
    expect(livekitPublishSourceKind("video", "camera")).toBe("camera");
  });

  it("detects a Postgres check-violation so Go Live can retry", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
    expect(isCheckViolation({ message: 'new row violates check constraint "live_sessions_source_check"' })).toBe(true);
    expect(isCheckViolation({ code: "23505", message: "duplicate" })).toBe(false);
  });
});
