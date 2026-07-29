import type { DeviceInformation, ExportedFile, PersistedSession } from "@/contracts";
import { capabilitiesFor } from "@/platform/bridge/capabilities";
import { PlatformError, unsupported } from "@/platform/bridge/errors";
import type { PlatformBridge } from "@/platform/bridge/types";
import { createWebBridge } from "@/platform/bridge/web";

const SESSION_KEY = "vybz.platform.session.android.v1";

/**
 * Android Capacitor bridge stub — reuses web file inputs until document-picker
 * plugins are wired in Phase 2.A. Session key is isolated from web.
 */
export function createAndroidBridge(): PlatformBridge {
  const web = createWebBridge();

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
          // Phase 2.A: Capacitor Preferences / secure storage plugin
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (err) {
          throw new PlatformError("io", "Failed to persist Android session", err);
        }
      },
      async restoreSession() {
        try {
          const raw = localStorage.getItem(SESSION_KEY);
          if (!raw) return null;
          return JSON.parse(raw) as PersistedSession;
        } catch {
          return null;
        }
      },
      async clearSession() {
        localStorage.removeItem(SESSION_KEY);
      },
    },

    processing: {
      async getCapabilities() {
        return capabilitiesFor("android");
      },
      async analyzeAudio(_input) {
        return {
          jobId: crypto.randomUUID(),
          status: "queued",
          engine: "portable",
          createdAt: new Date().toISOString(),
        };
      },
      async analyzeArtwork(_input) {
        return {
          jobId: crypto.randomUUID(),
          status: "queued",
          engine: "portable",
          createdAt: new Date().toISOString(),
        };
      },
      async cancelJob(_jobId: string) {
        /* stub */
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
      async shareExport(_file: ExportedFile) {
        throw unsupported("shareExport (Phase 2.A)");
      },
    },
  };
}
