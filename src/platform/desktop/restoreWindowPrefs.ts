/**
 * Restore window size/position/theme prefs when running under Tauri.
 * No-ops on web. Call once after PlatformProvider mounts.
 */
import { normalizeWindowPrefs } from "@/platform/desktop/windowPrefs";

export async function restoreDesktopWindowPrefs(): Promise<void> {
  try {
    const mod = await import("@/platform/bridge/tauriInvoke");
    const raw = await mod.invokeWindowPrefsGet();
    if (!raw) return;
    const prefs = normalizeWindowPrefs(raw);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.suiteTheme = prefs.theme;
    }
    // Geometry apply requires Tauri window API — prefs are persisted for next native session.
    await mod.invokeWindowPrefsSet(prefs);
  } catch {
    /* non-desktop or command unavailable */
  }
}
