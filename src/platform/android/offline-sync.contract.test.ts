/**
 * Detox-style scenario contract (Phase 13) — Vitest without a device.
 * offline import → reconnect sync (+ upload retry).
 */
import { describe, expect, it } from "vitest";
import { createMemoryMutationQueue } from "@/platform/sync/mutationQueue";
import { createMemoryUploadStore, createUploadQueue } from "@/platform/sync/uploadQueue";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";
import { createAndroidSecurePreferencesForTests } from "@/platform/android/keystorePreferences";

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

  it("KeyStore prefs survive offline import and reconnect", async () => {
    const prefs = createAndroidSecurePreferencesForTests();
    await prefs.setJson("offline-import", { releaseId: "r-13", files: ["a.wav"] });
    expect(await prefs.getJson<{ releaseId: string }>("offline-import")).toMatchObject({
      releaseId: "r-13",
    });
  });

  it("failed upload retries after reconnect", async () => {
    let attempts = 0;
    const uploads = createUploadQueue({
      store: createMemoryUploadStore(),
      maxAttempts: 3,
      uploader: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("offline");
      },
    });
    await uploads.enqueue({
      fileName: "master.wav",
      sizeBytes: 2048,
      mimeType: "audio/wav",
      releaseId: "r-retry",
    });
    await uploads.tick();
    expect((await uploads.list())[0]!.status).toBe("failed");
    const after = await uploads.drain();
    expect(after[0]!.status).toBe("succeeded");
    expect(attempts).toBeGreaterThanOrEqual(2);
  });
});
