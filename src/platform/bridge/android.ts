import type { DeviceInformation, ExportedFile, PersistedSession } from "@/contracts";
import { capabilitiesFor } from "@/platform/bridge/capabilities";
import { PlatformError, unsupported } from "@/platform/bridge/errors";
import type { PlatformBridge } from "@/platform/bridge/types";
import { createWebBridge } from "@/platform/bridge/web";
import {
  createSecurePreferences,
  memoryPreferenceKv,
  type PreferenceKv,
} from "@/platform/cache/securePreferences";

const SESSION_KEY = "session";

function browserOrMemoryKv(): PreferenceKv {
  if (typeof localStorage === "undefined") return memoryPreferenceKv();
  return {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
    removeItem: (k) => localStorage.removeItem(k),
  };
}

/**
 * Android Capacitor bridge — secure preference-backed session; web file inputs
 * until document-picker plugins land. Deep links via Cap App listener separately.
 */
export function createAndroidBridge(): PlatformBridge {
  const web = createWebBridge();
  const prefs = createSecurePreferences(browserOrMemoryKv(), "vybz.android.secure.v1");

  return {
    kind: "android",

    files: {
      async selectAudio() {
        return web.files.selectAudio();
      },
      async selectArtwork() {
        return web.files.selectArtwork();
      },
      async saveExport(file: ExportedFile) {
        return web.files.saveExport(file);
      },
      async revealFile() {
        throw unsupported("revealFile on Android");
      },
    },

    auth: {
      async persistSession(session: PersistedSession) {
        try {
          await prefs.setJson(SESSION_KEY, session);
        } catch (err) {
          throw new PlatformError("io", "Failed to persist Android session", err);
        }
      },
      async restoreSession() {
        try {
          return (await prefs.getJson<PersistedSession>(SESSION_KEY)) ?? null;
        } catch {
          return null;
        }
      },
      async clearSession() {
        await prefs.remove(SESSION_KEY);
      },
    },

    processing: {
      async getCapabilities() {
        return capabilitiesFor("android");
      },
      async analyzeAudio(input) {
        return web.processing.analyzeAudio(input);
      },
      async analyzeArtwork(input) {
        return web.processing.analyzeArtwork(input);
      },
      async cancelJob(jobId: string) {
        return web.processing.cancelJob(jobId);
      },
    },

    notifications: {
      async requestPermission() {
        return web.notifications.requestPermission();
      },
      async show(notification) {
        return web.notifications.show(notification);
      },
    },

    system: {
      async openExternalUrl(url: string) {
        return web.system.openExternalUrl(url);
      },
      async getDeviceInfo(): Promise<DeviceInformation> {
        return {
          platform: "android",
          userAgent: navigator.userAgent,
          locale: navigator.language,
          online: navigator.onLine,
        };
      },
      async getNetworkState() {
        return web.system.getNetworkState();
      },
    },

    sharing: {
      async receiveSharedFiles() {
        return [];
      },
      async shareExport(file: ExportedFile) {
        // Share-sheet when Web Share API is available; else download fallback.
        if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
          try {
            const shared = new File([file.blob], file.name, { type: file.mimeType });
            await navigator.share({ files: [shared], title: file.name });
            return;
          } catch {
            /* fall through */
          }
        }
        return web.files.saveExport(file);
      },
    },
  };
}
