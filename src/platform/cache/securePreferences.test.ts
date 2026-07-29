import { describe, expect, it } from "vitest";
import { createSecurePreferences, memoryPreferenceKv } from "./securePreferences";

describe("secure preferences (AES-GCM)", () => {
  it("seals and restores JSON drafts", async () => {
    const prefs = createSecurePreferences(memoryPreferenceKv());
    await prefs.setJson("credits-draft", { releaseId: "r1", names: ["Ada"] });
    expect(await prefs.getJson<{ releaseId: string }>("credits-draft")).toEqual({
      releaseId: "r1",
      names: ["Ada"],
    });
    await prefs.remove("credits-draft");
    expect(await prefs.get("credits-draft")).toBeNull();
  });

  it("stores ciphertext, not plaintext", async () => {
    const kv = memoryPreferenceKv();
    const prefs = createSecurePreferences(kv);
    await prefs.set("secret", "plain-draft-value");
    const raw = await kv.getItem("vybz.secure.v1:secret");
    expect(raw).toMatch(/^aesgcm\.v1:/);
    expect(raw).not.toContain("plain-draft-value");
  });
});
