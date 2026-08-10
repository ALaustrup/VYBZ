import { describe, expect, it } from "vitest";
import { CAPABILITY_REGISTRY, capabilitiesFor } from "@/platform/bridge/capabilities";
import { createMockBridge } from "@/platform/bridge/mock";
import { PlatformError } from "@/platform/bridge/errors";
import { createMemoryMutationQueue } from "@/platform/sync";
import { createMemoryCache } from "@/platform/cache";
import { parseDeepLink, deepLinkToAppPath } from "@/platform/deeplinks";
import type { PlaybackController } from "@/contracts";

describe("PlatformBridge mock contract", () => {
  it("reports web capabilities from registry", async () => {
    const bridge = createMockBridge();
    expect(bridge.kind).toBe("web");
    const caps = await bridge.processing.getCapabilities();
    expect(caps).toEqual(capabilitiesFor("web"));
    expect(caps.portableAudioInspect).toBe(true);
    expect(caps.nativeBatchAudio).toBe(false);
  });

  it("reports dry playback capabilities (M9)", async () => {
    const bridge = createMockBridge();
    const caps = await bridge.playback.getCapabilities();
    expect(caps.dryHtmlAudio).toBe(true);
    expect(caps.nativeDsp).toBe(false);
    expect(caps.mediaSession).toBe(false);
    expect(caps.playbackLifecycle).toBe(false);
    expect(caps.audioFocus).toBe(false);
    const controller = {} as PlaybackController;
    expect(bridge.playback.bindMediaSession(controller)).toBeTypeOf("function");
    expect(bridge.playback.bindPlaybackLifecycle(controller)).toBeTypeOf("function");
  });

  it("persists and clears session", async () => {
    const bridge = createMockBridge();
    await bridge.auth.persistSession({ payload: '{"access":"x"}', updatedAt: "2026-07-28T00:00:00.000Z" });
    const restored = await bridge.auth.restoreSession();
    expect(restored?.payload).toContain("access");
    await bridge.auth.clearSession();
    expect(await bridge.auth.restoreSession()).toBeNull();
  });

  it("queues portable analyze jobs", async () => {
    const bridge = createMockBridge({
      audioFiles: [
        { id: "1", name: "a.wav", mimeType: "audio/wav", sizeBytes: 100 },
      ],
    });
    const files = await bridge.files.selectAudio();
    const job = await bridge.processing.analyzeAudio({ file: files[0]! });
    expect(job.engine).toBe("portable");
    expect(job.status).toBe("queued");
  });

  it("throws unsupported for revealFile", async () => {
    const bridge = createMockBridge();
    await expect(bridge.files.revealFile?.("/tmp/x")).rejects.toBeInstanceOf(PlatformError);
  });
});

describe("capability registry", () => {
  it("defines all platform kinds", () => {
    expect(Object.keys(CAPABILITY_REGISTRY).sort()).toEqual(["android", "desktop", "ios", "web"]);
    expect(capabilitiesFor("desktop").nativeTranscode).toBe(true);
    expect(capabilitiesFor("android").maxLocalFileBytes).toBeGreaterThan(0);
    expect(capabilitiesFor("ios").maxLocalFileBytes).toBeGreaterThan(0);
  });
});

describe("mutation queue", () => {
  it("dedupes by idempotency key", async () => {
    const q = createMemoryMutationQueue();
    const a = await q.enqueue({
      userId: "u1",
      projectId: "p1",
      operation: "release.update_metadata",
      payload: { title: "A" },
      idempotencyKey: "k1",
    });
    const b = await q.enqueue({
      userId: "u1",
      projectId: "p1",
      operation: "release.update_metadata",
      payload: { title: "B" },
      idempotencyKey: "k1",
    });
    expect(a.id).toBe(b.id);
    expect((await q.list()).length).toBe(1);
  });
});

describe("memory cache", () => {
  it("stores and expires", async () => {
    const cache = createMemoryCache<string>();
    await cache.set("k", "v", 1);
    expect(await cache.get("k")).toBe("v");
    await new Promise((r) => setTimeout(r, 5));
    expect(await cache.get("k")).toBeUndefined();
  });
});

describe("deep links", () => {
  it("parses release open links", () => {
    const link = parseDeepLink("https://vybz.cloud/releases/abc?x=1");
    expect(link.kind).toBe("open_release");
    expect(deepLinkToAppPath(link)).toBe("/release/abc");
  });

  it("maps auth callback", () => {
    const link = parseDeepLink("https://vybz.cloud/auth/callback?code=1");
    expect(link.kind).toBe("oauth_callback");
    expect(deepLinkToAppPath(link)).toBe("/auth/callback");
  });
});
