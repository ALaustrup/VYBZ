/**
 * Detox-style scenario contract (Phase 6) — runnable as Vitest without a device.
 * Documents: import → offline → reconnect → sync.
 * Kept under src/ so Playwright (testDir: e2e) does not load Vitest files.
 */
import { describe, expect, it } from "vitest";
import { createMemoryMutationQueue } from "@/platform/sync/mutationQueue";
import { createMemoryUploadStore, createUploadQueue } from "@/platform/sync/uploadQueue";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";

describe("Android Detox scenario (contract)", () => {
  it("import → offline draft → reconnect sync", async () => {
    const kv = memoryPreferenceKv();
    const prefs = createSecurePreferences(kv);
    const mutations = createMemoryMutationQueue();
    const uploads = createUploadQueue({
      store: createMemoryUploadStore(),
      uploader: async () => undefined,
    });

    await prefs.setJson("credits-draft", {
      releaseId: "r-detox",
      credits: [{ displayName: "Ada", role: "primary_artist" }],
    });
    await uploads.enqueue({
      fileName: "track.wav",
      sizeBytes: 1024,
      mimeType: "audio/wav",
      releaseId: "r-detox",
    });
    await mutations.enqueue({
      userId: "u1",
      projectId: "r-detox",
      operation: "credit.upsert",
      payload: { displayName: "Ada" },
      idempotencyKey: "detox-credit-1",
    });

    expect(await prefs.getJson<{ releaseId: string }>("credits-draft")).toMatchObject({
      releaseId: "r-detox",
    });
    expect((await uploads.list())[0]!.status).toBe("queued");
    expect((await mutations.list()).length).toBe(1);

    const after = await uploads.drain();
    expect(after[0]!.status).toBe("succeeded");
    expect((await mutations.list())[0]!.idempotencyKey).toBe("detox-credit-1");
  });
});
