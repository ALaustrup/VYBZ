import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  RELEASE_ASSEMBLE_VERSION,
  assembleReleasePackage,
} from "@/features/releases/assembleReleasePackage";
import type { ReleaseBundle } from "@vybz/domain/releases";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * M8 exit-gate starter — Masterplan §10 Release Assembly & Readiness.
 * Gate: A release assembles without hidden requirements; every warning cites a rule
 * or rationale; packages complete and checksummed; contributor metadata needs no
 * collaborative editing.
 */
describe("M8 assembly gate", () => {
  it("cites the M8 gate and ships a versioned assemble package", () => {
    const masterplan = readFileSync(path.join(ROOT, "VYBZ_MASTERPLAN.md"), "utf8");
    expect(masterplan).toMatch(/M8.*Release Assembly|Release Assembly & Readiness/s);
    expect(RELEASE_ASSEMBLE_VERSION).toMatch(/^m8\./);
  });

  it("assembles a checksummed package with rule-cited findings and credits JSON", async () => {
    const bundle: ReleaseBundle = {
      project: {
        id: "rel-test-001",
        ownerId: "owner",
        title: "Demo Release",
        artistName: "Demo Artist",
        status: "ready",
        metadata: {},
        idempotencyKey: null,
        createdAt: "2026-08-09T00:00:00.000Z",
        updatedAt: "2026-08-09T00:00:00.000Z",
        deletedAt: null,
      },
      assets: [
        {
          id: "a1",
          releaseId: "rel-test-001",
          ownerId: "owner",
          kind: "audio",
          fileName: "master.wav",
          mimeType: "audio/wav",
          sizeBytes: 12,
          checksum: "abc",
          probe: {},
          createdAt: "2026-08-09T00:00:00.000Z",
        },
      ],
      findings: [
        {
          id: "f1",
          releaseId: "rel-test-001",
          ownerId: "owner",
          assetId: "a1",
          code: "AUDIO_FINISH_OVERPROCESSED",
          severity: "warning",
          category: "audio",
          title: "Finish looks over-processed (heuristic)",
          detail: "heuristic detail",
          status: "open",
          createdAt: "2026-08-09T00:00:00.000Z",
          updatedAt: "2026-08-09T00:00:00.000Z",
        },
      ],
    };

    const audio = new TextEncoder().encode("RIFF....WAVE");
    const result = await assembleReleasePackage({
      bundle,
      credits: [
        {
          id: "c1",
          releaseId: "rel-test-001",
          ownerId: "owner",
          displayName: "Demo Artist",
          role: "primary_artist",
          splitBps: 10000,
          status: "confirmed",
          source: "manual",
          sortOrder: 0,
          metadata: {},
          createdAt: "2026-08-09T00:00:00.000Z",
          updatedAt: "2026-08-09T00:00:00.000Z",
        },
      ],
      files: [{ path: "audio/master.wav", bytes: audio }],
    });

    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifest.packageSha256).toBe(result.sha256);
    expect(result.manifest.findings[0]?.ruleCitation).toMatch(/^rule:AUDIO_FINISH_OVERPROCESSED/);
    expect(result.manifest.credits[0]?.displayName).toBe("Demo Artist");
    expect(result.manifest.entrySha256["audio/master.wav"]).toMatch(/^[a-f0-9]{64}$/);
    expect(result.bytes.byteLength).toBeGreaterThan(100);
    expect(result.fileName).toContain("release.zip");
  });

  it("surfaces assemble on the distribution package page", () => {
    const page = readFileSync(
      path.join(ROOT, "src/features/distribution/DistributionReportPage.tsx"),
      "utf8"
    );
    expect(page).toContain("assembleReleasePackage");
    expect(page).toContain("m8-assemble");
  });
});
