import type {
  DeviceInformation,
  ExportedFile,
  PersistedSession,
  SelectedFile,
} from "@/contracts";
import { capabilitiesFor } from "@/platform/bridge/capabilities";
import { PlatformError, unsupported } from "@/platform/bridge/errors";
import type { PlatformBridge } from "@/platform/bridge/types";
import { createWebBridge } from "@/platform/bridge/web";

const SESSION_KEY = "vybz.platform.session.desktop.v1";

/**
 * Desktop bridge stub — native pickers/processing wire through Tauri in Phase 2.D.
 * Falls back to web file APIs when Tauri commands are unavailable (PoC / browser preview).
 */
export function createDesktopBridge(): PlatformBridge {
  const web = createWebBridge();

  return {
    kind: "desktop",

    files: {
      async selectAudio() {
        const native = await tryTauriPick("audio");
        if (native) return native;
        return web.files.selectAudio();
      },
      async selectArtwork() {
        const native = await tryTauriPick("artwork");
        if (native) return native;
        return web.files.selectArtwork();
      },
      async selectFolder() {
        if (web.files.selectFolder) return web.files.selectFolder();
        throw unsupported("selectFolder");
      },
      async saveExport(file: ExportedFile) {
        const saved = await tryTauriSave(file);
        if (saved) return;
        return web.files.saveExport(file);
      },
      async revealFile(path: string) {
        const ok = await tryTauriReveal(path);
        if (!ok) throw unsupported("revealFile");
      },
    },

    auth: {
      async persistSession(session: PersistedSession) {
        try {
          const mod = await import("@/platform/bridge/tauriInvoke");
          const ok = await mod.invokeSecureSet("session", JSON.stringify(session));
          if (ok) return;
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (err) {
          throw new PlatformError("io", "Failed to persist desktop session", err);
        }
      },
      async restoreSession() {
        try {
          const mod = await import("@/platform/bridge/tauriInvoke");
          const sealed = await mod.invokeSecureGet("session");
          if (sealed) return JSON.parse(sealed) as PersistedSession;
          const raw = localStorage.getItem(SESSION_KEY);
          if (!raw) return null;
          return JSON.parse(raw) as PersistedSession;
        } catch {
          return null;
        }
      },
      async clearSession() {
        try {
          const mod = await import("@/platform/bridge/tauriInvoke");
          await mod.invokeSecureClear("session");
        } catch {
          /* ignore */
        }
        localStorage.removeItem(SESSION_KEY);
      },
    },

    processing: {
      async getCapabilities() {
        return capabilitiesFor("desktop");
      },
      async analyzeAudio(input) {
        if (input.file.localPath) {
          try {
            const mod = await import("@/platform/bridge/tauriInvoke");
            const native = await mod.invokeAnalyzeAudio(input.file.localPath, 2048);
            if (native) {
              return {
                jobId: crypto.randomUUID(),
                status: "succeeded",
                engine: "native",
                createdAt: new Date().toISOString(),
                result: native as unknown as Record<string, unknown>,
              };
            }
          } catch {
            /* fall through to portable */
          }
        }
        return web.processing.analyzeAudio(input);
      },
      async analyzeArtwork(input) {
        return web.processing.analyzeArtwork(input);
      },
      async cancelJob(_jobId: string) {
        /* native cancel wiring in later Engine pass */
      },
    },

    playback: {
      async getCapabilities() {
        return web.playback.getCapabilities();
      },
      bindMediaSession(controller) {
        return web.playback.bindMediaSession(controller);
      },
      bindPlaybackLifecycle(controller) {
        return web.playback.bindPlaybackLifecycle(controller);
      },
      bindAudioFocus(controller) {
        return web.playback.bindAudioFocus(controller);
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
        const opened = await tryTauriOpen(url);
        if (!opened) await web.system.openExternalUrl(url);
      },
      async getDeviceInfo(): Promise<DeviceInformation> {
        return {
          platform: "desktop",
          userAgent: navigator.userAgent,
          locale: navigator.language,
          online: navigator.onLine,
        };
      },
      async getNetworkState() {
        return web.system.getNetworkState();
      },
    },
  };
}

async function tryTauriPick(_kind: "audio" | "artwork"): Promise<SelectedFile[] | null> {
  try {
    const mod = await import("@/platform/bridge/tauriInvoke");
    return await mod.invokePickFiles(_kind);
  } catch {
    return null;
  }
}

async function tryTauriSave(file: ExportedFile): Promise<boolean> {
  try {
    const mod = await import("@/platform/bridge/tauriInvoke");
    return await mod.invokeSaveExport(file);
  } catch {
    return false;
  }
}

async function tryTauriReveal(path: string): Promise<boolean> {
  try {
    const mod = await import("@/platform/bridge/tauriInvoke");
    return await mod.invokeReveal(path);
  } catch {
    return false;
  }
}

async function tryTauriOpen(url: string): Promise<boolean> {
  try {
    const mod = await import("@/platform/bridge/tauriInvoke");
    return await mod.invokeOpenUrl(url);
  } catch {
    return false;
  }
}
