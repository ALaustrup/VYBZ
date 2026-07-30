import { describe, expect, it, vi } from "vitest";
import { checkDesktopUpdates } from "./updateCheck";
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
