import type {
  DeviceInformation,
  ExportedFile,
  PersistedSession,
  SelectedFile,
  SelectedFolder,
} from "@/contracts";
import { capabilitiesFor } from "@/platform/bridge/capabilities";
import { unsupported } from "@/platform/bridge/errors";
import type { PlatformBridge } from "@/platform/bridge/types";

export interface MockBridgeOptions {
  session?: PersistedSession | null;
  audioFiles?: SelectedFile[];
  artworkFiles?: SelectedFile[];
  folder?: SelectedFolder | null;
  online?: boolean;
}

/**
 * Deterministic bridge for unit/contract tests — no DOM side effects.
 */
export function createMockBridge(options: MockBridgeOptions = {}): PlatformBridge {
  let session = options.session ?? null;
  const online = options.online ?? true;

  return {
    kind: "web",

    files: {
      async selectAudio() {
        return options.audioFiles ? [...options.audioFiles] : [];
      },
      async selectArtwork() {
        return options.artworkFiles ? [...options.artworkFiles] : [];
      },
      async selectFolder() {
        return options.folder ?? null;
      },
      async saveExport(_file: ExportedFile) {
        /* no-op in tests */
      },
      async revealFile() {
        throw unsupported("revealFile");
      },
    },

    auth: {
      async persistSession(next) {
        session = next;
      },
      async restoreSession() {
        return session;
      },
      async clearSession() {
        session = null;
      },
    },

    processing: {
      async getCapabilities() {
        return capabilitiesFor("web");
      },
      async analyzeAudio() {
        return {
          jobId: "mock-audio-job",
          status: "queued",
          engine: "portable",
          createdAt: new Date().toISOString(),
        };
      },
      async analyzeArtwork() {
        return {
          jobId: "mock-art-job",
          status: "queued",
          engine: "portable",
          createdAt: new Date().toISOString(),
        };
      },
      async cancelJob(_jobId: string) {
        /* mock: no durable runner */
      },
    },

    playback: {
      async getCapabilities() {
        const { dryPlaybackCapabilities } = await import("@/platform/bridge/playbackCapabilities");
        return dryPlaybackCapabilities();
      },
      bindMediaSession() {
        return () => undefined;
      },
      bindPlaybackLifecycle() {
        return () => undefined;
      },
      bindAudioFocus() {
        return () => undefined;
      },
    },

    notifications: {
      async requestPermission() {
        return true;
      },
      async show() {
        /* no-op */
      },
    },

    system: {
      async openExternalUrl() {
        /* no-op */
      },
      async getDeviceInfo(): Promise<DeviceInformation> {
        return {
          platform: "web",
          userAgent: "vybz-mock",
          locale: "en-US",
          online,
        };
      },
      async getNetworkState() {
        return online ? "online" : "offline";
      },
    },
  };
}
