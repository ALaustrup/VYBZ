import { describe, expect, it } from "vitest";
import { createSecurePreferences, memoryPreferenceKv } from "./securePreferences";

describe("secure preferences", () => {
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
});
