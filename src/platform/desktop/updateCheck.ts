/**
 * Desktop updater check — per-OS stable channel feeds (Phase 17).
 * When remote returns 204 / empty platforms for current version → "no update".
 */

export type DesktopOs = "windows" | "darwin" | "linux";

export type UpdateCheckResult =
  | { status: "no_update"; httpStatus: number }
  | { status: "update_available"; version: string; url: string }
  | { status: "error"; message: string };

export const DESKTOP_STABLE_FEED_URLS: Record<DesktopOs, string> = {
  windows: "https://update.vybz.cloud/windows/stable.json",
  darwin: "https://update.vybz.cloud/darwin/stable.json",
  linux: "https://update.vybz.cloud/linux/stable.json",
};

/** @deprecated Prefer DESKTOP_STABLE_FEED_URLS.windows — Phase 12 alias */
export const DESKTOP_STABLE_FEED_URL = DESKTOP_STABLE_FEED_URLS.windows;

const PLATFORM_KEYS: Record<DesktopOs, string[]> = {
  windows: ["windows-x86_64"],
  darwin: ["darwin-aarch64", "darwin-x86_64"],
  linux: ["linux-x86_64"],
};

export function resolveDesktopOs(
  platform: string = typeof process !== "undefined" ? process.platform : "win32",
): DesktopOs {
  if (platform === "darwin") return "darwin";
  if (platform === "linux") return "linux";
  return "windows";
}

export async function checkDesktopUpdates(
  currentVersion: string,
  fetchImpl: typeof fetch = fetch,
  feedUrl?: string,
  os: DesktopOs = resolveDesktopOs(),
): Promise<UpdateCheckResult> {
  const url = feedUrl ?? DESKTOP_STABLE_FEED_URLS[os];
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 204) {
      return { status: "no_update", httpStatus: 204 };
    }
    if (!res.ok) {
      return { status: "error", message: `feed HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      version?: string;
      platforms?: Record<string, { url?: string }>;
    };
    if (!body.version || body.version === currentVersion) {
      return { status: "no_update", httpStatus: res.status };
    }
    for (const key of PLATFORM_KEYS[os]) {
      const plat = body.platforms?.[key];
      if (plat?.url) {
        return { status: "update_available", version: body.version, url: plat.url };
      }
    }
    return { status: "no_update", httpStatus: res.status };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
