import { describe, expect, it, vi } from "vitest";
import { loadStoredDeviceToken, registerDeviceToken } from "./deviceToken";
import { memoryPreferenceKv } from "@/platform/cache/securePreferences";

describe("FCM device token registration", () => {
  it("stores unavailable stub when plugin missing (no server send)", async () => {
    const kv = memoryPreferenceKv();
    const record = await registerDeviceToken({ kv, plugin: null, platform: "android" });
    expect(record?.permission).toBe("unavailable");
    expect(record?.token).toBe("");
    const stored = await loadStoredDeviceToken(kv);
    expect(stored?.permission).toBe("unavailable");
  });

  it("stores granted token from mock Cap plugin", async () => {
    const kv = memoryPreferenceKv();
    const plugin = {
      requestPermissions: vi.fn(async () => ({ receive: "granted" as const })),
      register: vi.fn(async () => undefined),
      addListener: vi.fn(async (_e: string, cb: (t: { value: string }) => void) => {
        queueMicrotask(() => cb({ value: "fcm-test-token" }));
        return { remove: async () => undefined };
      }),
    };
    const record = await registerDeviceToken({ kv, plugin, platform: "android" });
    expect(record?.token).toBe("fcm-test-token");
    expect(record?.permission).toBe("granted");
  });
});
