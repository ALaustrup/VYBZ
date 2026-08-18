import { describe, expect, it } from "vitest";
import { NOT_MEASURED } from "@/product/invariants";
import {
  buildVerifyReport,
  buildVprovManifest,
  buildVprovZip,
  eventsJsonl,
  type SealedProvenance,
} from "./buildVprov";

const sample: SealedProvenance = {
  id: "ps1",
  liveSessionId: "live-1",
  hostId: "host-1",
  status: "sealed",
  strength: "full",
  eventCount: 2,
  chainRoot: "abc",
  atcBurned: 60,
  openedAt: "2026-08-18T00:00:00.000Z",
  sealedAt: "2026-08-18T00:02:00.000Z",
  events: [
    {
      seq: 1,
      eventType: "open",
      payload: {},
      prevHash: "0".repeat(64),
      rowHash: "aaa",
      createdAt: "2026-08-18T00:00:00.000Z",
    },
    {
      seq: 2,
      eventType: "seal",
      payload: { atc_burned: 60 },
      prevHash: "aaa",
      rowHash: "abc",
      createdAt: "2026-08-18T00:02:00.000Z",
    },
  ],
};

describe("vprov package", () => {
  it("refuses a not-AI claim in the manifest and the human report", () => {
    const m = buildVprovManifest(sample);
    expect(m.notAiClaim).toBe(NOT_MEASURED);
    expect(m.audioSha).toBeNull();
    expect(m.audioShaKind).toBeNull();
    expect(m.format).toBe("vybz.vprov");
    expect(m.strength).toBe("full");
    expect(m.atcBurned).toBe(60);
    const report = buildVerifyReport(sample);
    expect(report).toContain("does not claim the music was human-composed");
    expect(report).toContain(`Not AI: ${NOT_MEASURED}`);
    expect(report).toContain(`Audio SHA: ${NOT_MEASURED}`);
  });

  it("writes one JSON line per event", () => {
    const lines = eventsJsonl(sample.events).split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).eventType).toBe("open");
  });

  it("labels a client DAW digest as declared in the package", () => {
    const withSha: SealedProvenance = {
      ...sample,
      events: [
        ...sample.events,
        {
          seq: 3,
          eventType: "signal",
          payload: { kind: "declared", audioSha: "c".repeat(64), source: "daw_pcm_client", bytesHashed: 96 },
          prevHash: "abc",
          rowHash: "ddd",
          createdAt: "2026-08-18T00:02:01.000Z",
        },
      ],
    };
    const m = buildVprovManifest(withSha);
    expect(m.audioSha).toBe("c".repeat(64));
    expect(m.audioShaKind).toBe("declared");
    expect(buildVerifyReport(withSha)).toContain("declared client DAW PCM");
    expect(buildVerifyReport(withSha)).not.toContain("measured from stored bytes");
  });

  it("builds a zip with the three required files", async () => {
    const { bytes, zipSha256 } = await buildVprovZip(sample);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(zipSha256).toHaveLength(64);
  });
});
