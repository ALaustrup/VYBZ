import { describe, expect, it, vi } from "vitest";
import { checkDesktopUpdates, DESKTOP_STABLE_FEED_URLS, resolveDesktopOs } from "./updateCheck";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";
import { migrateUnsealedLocalStorage } from "./securePreferences";

describe("desktop updateCheck", () => {
  it("treats HTTP 204 as no_update", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const result = await checkDesktopUpdates("1.1.0", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ status: "no_update", httpStatus: 204 });
  });

  it("treats same version as no_update", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ version: "1.1.0", platforms: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await checkDesktopUpdates("1.1.0", fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe("no_update");
  });

  it("resolves darwin/linux feeds and platform keys", async () => {
    expect(resolveDesktopOs("darwin")).toBe("darwin");
    expect(resolveDesktopOs("linux")).toBe("linux");
    expect(DESKTOP_STABLE_FEED_URLS.darwin).toContain("/darwin/stable.json");
    expect(DESKTOP_STABLE_FEED_URLS.linux).toContain("/linux/stable.json");

    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            version: "1.1.1",
            platforms: {
              "darwin-aarch64": { url: "https://update.vybz.cloud/darwin/VYBZ.dmg" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    const result = await checkDesktopUpdates(
      "1.1.0",
      fetchImpl as unknown as typeof fetch,
      DESKTOP_STABLE_FEED_URLS.darwin,
      "darwin",
    );
    expect(result).toEqual({
      status: "update_available",
      version: "1.1.1",
      url: "https://update.vybz.cloud/darwin/VYBZ.dmg",
    });
  });
});

describe("desktop securePreferences migration", () => {
  it("migrates unsealed localStorage into AES-GCM prefs", async () => {
    const kv = memoryPreferenceKv();
    const prefs = createSecurePreferences(kv);
    localStorage.setItem("legacy.draft", "hello-unsealed");
    const moved = await migrateUnsealedLocalStorage(prefs, "legacy.draft");
    expect(moved).toBe(true);
    expect(localStorage.getItem("legacy.draft")).toBeNull();
    expect(await prefs.get("legacy.draft")).toBe("hello-unsealed");
  });
});
