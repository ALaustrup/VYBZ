/**
 * Desktop updater check — stable channel feed.
 * When remote returns 204 / empty platforms for current version → "no update".
 */

export type UpdateCheckResult =
  | { status: "no_update"; httpStatus: number }
  | { status: "update_available"; version: string; url: string }
  | { status: "error"; message: string };

export const DESKTOP_STABLE_FEED_URL = "https://update.vybz.cloud/windows/stable.json";

export async function checkDesktopUpdates(
  currentVersion: string,
  fetchImpl: typeof fetch = fetch,
  feedUrl = DESKTOP_STABLE_FEED_URL,
): Promise<UpdateCheckResult> {
  try {
    const res = await fetchImpl(feedUrl, {
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
    const win = body.platforms?.["windows-x86_64"];
    if (!win?.url) {
      return { status: "no_update", httpStatus: res.status };
    }
    return { status: "update_available", version: body.version, url: win.url };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
