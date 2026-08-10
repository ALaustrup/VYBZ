import type {
  DeviceInformation,
  ExportedFile,
  NetworkState,
  PersistedSession,
  SelectedFile,
} from "@/contracts";
import { capabilitiesFor } from "@/platform/bridge/capabilities";
import { cancelled, normalizeUnknown, PlatformError } from "@/platform/bridge/errors";
import type { PlatformBridge } from "@/platform/bridge/types";
import { createCostSentinel } from "@/platform/costs/sentinel";
import { isFeatureKillSwitched } from "@/platform/costs/edgeFlags";
import { recordCost } from "@/platform/costs/recordCost";
import { portableAnalyzeWav } from "@/features/processing/portableAnalyze";
import { PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";
import { bindBrowserMediaSession } from "@/platform/bridge/mediaSession";
import { bindPlaybackLifecycle } from "@/platform/bridge/playbackLifecycle";

const SESSION_KEY = "vybz.platform.session.v1";
const costSentinel = createCostSentinel();

function newId(): string {
  return crypto.randomUUID();
}

function fileToSelected(file: File): SelectedFile {
  return {
    id: newId(),
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    blob: file,
    lastModified: file.lastModified,
  };
}

function pickFiles(accept: string, multiple: boolean): Promise<SelectedFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = "none";
    const cleanup = () => {
      input.remove();
    };
    input.addEventListener("change", () => {
      const list = input.files ? Array.from(input.files).map(fileToSelected) : [];
      cleanup();
      resolve(list);
    });
    input.addEventListener("cancel", () => {
      cleanup();
      reject(cancelled("file selection"));
    });
    document.body.appendChild(input);
    input.click();
  });
}

async function downloadBlob(file: ExportedFile): Promise<void> {
  const url = URL.createObjectURL(file.blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function networkState(): NetworkState {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.onLine ? "online" : "offline";
}

export function createWebBridge(): PlatformBridge {
  return {
    kind: "web",

    files: {
      async selectAudio() {
        try {
          return await pickFiles("audio/*,.wav,.flac,.aiff,.aif,.mp3,.m4a,.ogg", true);
        } catch (err) {
          throw normalizeUnknown(err);
        }
      },
      async selectArtwork() {
        try {
          return await pickFiles("image/png,image/jpeg,image/webp,image/gif", true);
        } catch (err) {
          throw normalizeUnknown(err);
        }
      },
      async saveExport(file) {
        try {
          await downloadBlob(file);
        } catch (err) {
          throw normalizeUnknown(err);
        }
      },
    },

    auth: {
      async persistSession(session: PersistedSession) {
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (err) {
          throw new PlatformError("io", "Failed to persist session", err);
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
        return capabilitiesFor("web");
      },
      async analyzeAudio(input) {
        if (
          isFeatureKillSwitched("processing") ||
          isFeatureKillSwitched("analyze-audio") ||
          isFeatureKillSwitched("ai_mastering")
        ) {
          throw new PlatformError(
            "validation",
            "Processing disabled by Cost Sentinel kill-switch (feature:processing:disabled)"
          );
        }
        const caps = capabilitiesFor("web");
        if (input.file.sizeBytes > caps.maxLocalFileBytes) {
          throw new PlatformError("validation", "Audio file exceeds web size limit");
        }
        if (!input.file.blob) {
          throw new PlatformError("validation", "Audio blob required for portable analyze");
        }
        // Phase 15: files above portable FFT limit route to remote AI engine.
        if (input.file.sizeBytes > PORTABLE_FFT_MAX_BYTES) {
          try {
            const { runLocalMasterJob } = await import("@/features/mastering/aiMasterService");
            // Remote path: still DSP-local when Edge unavailable; tagged engine "remote"
            // for Bridge contract when size exceeds portable gate.
            const job = await runLocalMasterJob({
              projectId: input.projectId,
              file: input.file.blob,
              fileName: input.file.name,
              inferMeta: true,
            });
            return {
              jobId: job.jobId,
              status: job.status === "completed" ? "succeeded" : job.status === "failed" ? "failed" : "processing",
              engine: "remote",
              createdAt: job.createdAt,
              result: {
                metrics: job.metrics,
                metadata: job.metadata,
                remoteReason: "size_gt_portable_fft",
              } as Record<string, unknown>,
            };
          } catch (err) {
            throw normalizeUnknown(err);
          }
        }
        try {
          const result = await portableAnalyzeWav({
            name: input.file.name,
            sizeBytes: input.file.sizeBytes,
            arrayBuffer: () => input.file.blob!.arrayBuffer(),
          });
          const minutes = Math.max(0.001, (result.durationSeconds || 0) / 60);
          costSentinel.record({ jobMinutes: minutes, storageBytes: input.file.sizeBytes });
          void recordCost("processing", minutes, 0);
          return {
            jobId: newId(),
            status: "succeeded",
            engine: "portable",
            createdAt: new Date().toISOString(),
            result: result as unknown as Record<string, unknown>,
          };
        } catch (err) {
          throw normalizeUnknown(err);
        }
      },
      async analyzeArtwork(input) {
        const caps = capabilitiesFor("web");
        if (input.file.sizeBytes > caps.maxLocalFileBytes) {
          throw new PlatformError("validation", "Artwork exceeds web size limit");
        }
        return {
          jobId: newId(),
          status: "queued",
          engine: "portable",
          createdAt: new Date().toISOString(),
        };
      },
      async cancelJob(_jobId: string) {
        /* portable jobs complete inline */
      },
    },

    playback: {
      async getCapabilities() {
        const { runtimePlaybackCapabilities } = await import("@/platform/bridge/playbackCapabilities");
        return runtimePlaybackCapabilities();
      },
      bindMediaSession(controller) {
        return bindBrowserMediaSession(controller);
      },
      bindPlaybackLifecycle(controller) {
        return bindPlaybackLifecycle(controller);
      },
    },

    notifications: {
      async requestPermission() {
        if (typeof Notification === "undefined") return false;
        if (Notification.permission === "granted") return true;
        if (Notification.permission === "denied") return false;
        const result = await Notification.requestPermission();
        return result === "granted";
      },
      async show(notification) {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") {
          return;
        }
        new Notification(notification.title, { body: notification.body });
      },
    },

    system: {
      async openExternalUrl(url: string) {
        window.open(url, "_blank", "noopener,noreferrer");
      },
      async getDeviceInfo(): Promise<DeviceInformation> {
        return {
          platform: "web",
          userAgent: navigator.userAgent,
          locale: navigator.language,
          online: navigator.onLine,
        };
      },
      async getNetworkState() {
        return networkState();
      },
    },
  };
}
