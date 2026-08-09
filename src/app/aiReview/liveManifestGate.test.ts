import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  LIVE_AI_REVIEW_MANIFEST_ENDPOINT,
  buildLiveAiReviewManifest,
  liveManifestHasFixturePaths,
} from "@/app/aiReview/liveManifest";
import { REQUIRED_PROD_SURFACE_IDS } from "@/perception/modules/websiteReview/prodSurfaces";

describe("live AI review manifest (public HTTPS for agents)", () => {
  it("exposes product surfaces without fixture paths", () => {
    const m = buildLiveAiReviewManifest("https://vybz.cloud");
    expect(m.id).toBe("vybz-ai-review-live");
    expect(m.mode).toBe("readonly");
    expect(m.manifestEndpoint).toBe(LIVE_AI_REVIEW_MANIFEST_ENDPOINT);
    expect(m.base).toBe("https://vybz.cloud");
    expect(m.guarantees).toContain("live-product-surfaces");
    expect(m.guarantees).toContain("bearer-token-required");
    expect(liveManifestHasFixturePaths(m)).toBe(false);
    expect(m.surfaces.some((s) => s.path.includes("__e2e__"))).toBe(false);
    const ids = m.surfaces.map((s) => s.id).sort();
    expect(ids).toEqual([...REQUIRED_PROD_SURFACE_IDS].sort());
  });

  it("wires a Vercel edge handler that requires Bearer token", () => {
    const api = readFileSync(
      path.join(process.cwd(), "api/ai-review/manifest.ts"),
      "utf8",
    );
    expect(api).toContain('runtime: "edge"');
    expect(api).toContain("AI_REVIEW_AGENT_TOKEN");
    expect(api).toContain("buildLiveAiReviewManifest");
    expect(api).toContain("unauthorized");
  });

  it("keeps SPA catch-all from claiming the API path in vercel.json docs via handler path", () => {
    expect(LIVE_AI_REVIEW_MANIFEST_ENDPOINT).toBe("/api/ai-review/manifest");
    const vercel = readFileSync(path.join(process.cwd(), "vercel.json"), "utf8");
    expect(vercel).toContain("/api/ai-review/manifest");
  });
});
