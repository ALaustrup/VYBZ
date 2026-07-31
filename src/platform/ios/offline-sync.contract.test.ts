/**
 * Detox-style iOS scenario contract (Phase 19) — Vitest without a device.
 * Deep-link opens release · Keychain prefs · background-safe upload retry.
 */
import { describe, expect, it } from "vitest";
import { createMemoryMutationQueue } from "@/platform/sync/mutationQueue";
import { createMemoryUploadStore, createUploadQueue } from "@/platform/sync/uploadQueue";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";
import { createIosSecurePreferencesForTests } from "@/platform/ios/keychainPreferences";
import { deepLinkToAppPath, parseDeepLink } from "@/platform/deeplinks";

describe("iOS Detox scenario (contract)", () => {
  it("deep-link vybz:// and Universal Link open /release/:id", () => {
    const custom = parseDeepLink("vybz://release/rel-ios-19");
    expect(custom.kind).toBe("open_release");
    expect(custom.releaseId).toBe("rel-ios-19");
    expect(deepLinkToAppPath(custom)).toBe("/release/rel-ios-19");

    const universal = parseDeepLink("https://vybz.cloud/release/rel-ios-19");
    expect(universal.kind).toBe("open_release");
    expect(deepLinkToAppPath(universal)).toBe("/release/rel-ios-19");
  });

  it("Keychain prefs survive offline import and reconnect", async () => {
    const prefs = createIosSecurePreferencesForTests();
    await prefs.setJson("offline-import", { releaseId: "r-19", files: ["a.wav"] });
    expect(await prefs.getJson<{ releaseId: string }>("offline-import")).toMatchObject({
      releaseId: "r-19",
    });
  });

  it("import → offline draft → reconnect sync with upload retry", async () => {
    const kv = memoryPreferenceKv();
    const prefs = createSecurePreferences(kv);
    const mutations = createMemoryMutationQueue();
    let attempts = 0;
    const uploads = createUploadQueue({
      store: createMemoryUploadStore(),
      maxAttempts: 3,
      uploader: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("background suspend");
      },
    });

    await prefs.setJson("credits-draft", {
      releaseId: "r-ios",
      credits: [{ displayName: "Ada", role: "primary_artist" }],
    });
    await uploads.enqueue({
      fileName: "track.wav",
      sizeBytes: 1024,
      mimeType: "audio/wav",
      releaseId: "r-ios",
    });
    await mutations.enqueue({
      userId: "u1",
      projectId: "r-ios",
      operation: "credit.upsert",
      payload: { displayName: "Ada" },
      idempotencyKey: "ios-detox-credit-1",
    });

    await uploads.tick();
    expect((await uploads.list())[0]!.status).toBe("failed");
    const after = await uploads.drain();
    expect(after[0]!.status).toBe("succeeded");
    expect(attempts).toBeGreaterThanOrEqual(2);
    expect((await mutations.list())[0]!.idempotencyKey).toBe("ios-detox-credit-1");
  });
});
