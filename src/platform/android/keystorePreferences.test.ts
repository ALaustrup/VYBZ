import { describe, expect, it } from "vitest";
import { createAndroidSecurePreferencesForTests } from "./keystorePreferences";

describe("Android KeyStore-backed secure preferences", () => {
  it("seals and restores JSON via AES-GCM layer", async () => {
    const prefs = createAndroidSecurePreferencesForTests();
    await prefs.setJson("session", { userId: "u-beta", token: "sealed" });
    expect(await prefs.getJson<{ userId: string }>("session")).toEqual({
      userId: "u-beta",
      token: "sealed",
    });
  });

  it("returns null for missing keys", async () => {
    const prefs = createAndroidSecurePreferencesForTests();
    expect(await prefs.get("missing")).toBeNull();
  });
});
