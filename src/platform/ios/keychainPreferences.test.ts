import { beforeEach, describe, expect, it } from "vitest";
import {
  createIosSecurePreferencesForTests,
} from "./keychainPreferences";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";

describe("iOS Keychain AES-GCM prefs", () => {
  beforeEach(() => {
    /* memory Kv — no native Keychain in Vitest */
  });

  it("encrypts and decrypts JSON round-trip", async () => {
    const prefs = createIosSecurePreferencesForTests();
    await prefs.setJson("session", { payload: '{"t":1}', updatedAt: "2026-07-30T00:00:00.000Z" });
    const restored = await prefs.getJson<{ payload: string }>("session");
    expect(restored?.payload).toContain('"t":1');
  });

  it("seal layer uses aesgcm.v1 prefix", async () => {
    const kv = memoryPreferenceKv();
    const prefs = createSecurePreferences(kv, "vybz.ios.keychain.v1");
    await prefs.set("secret", "hello-ios");
    const raw = await kv.getItem("vybz.ios.keychain.v1:secret");
    expect(raw?.startsWith("aesgcm.v1:")).toBe(true);
    expect(await prefs.get("secret")).toBe("hello-ios");
  });

  it("remove clears sealed value", async () => {
    const prefs = createIosSecurePreferencesForTests();
    await prefs.set("k", "v");
    await prefs.remove("k");
    expect(await prefs.get("k")).toBeNull();
  });
});
