import type {
  AudioInput,
  ArtworkInput,
  DeviceInformation,
  ExportedFile,
  GenerateAudioRequest,
  GenerateAudioResult,
  JobReference,
  NetworkState,
  PersistedSession,
  PlatformKind,
  PlaybackCapabilities,
  PlaybackController,
  ProcessingCapabilities,
  SelectedFile,
  SelectedFolder,
  SharedImport,
  VybzNotification,
} from "@/contracts";

/**
 * Typed capability boundary between shared app code and shells.
 * Domain / features must depend on this — never Tauri or Capacitor APIs.
 */
export interface PlatformBridge {
  readonly kind: PlatformKind;

  files: {
    selectAudio(): Promise<SelectedFile[]>;
    selectArtwork(): Promise<SelectedFile[]>;
    selectFolder?(): Promise<SelectedFolder | null>;
    saveExport(file: ExportedFile): Promise<void>;
    revealFile?(path: string): Promise<void>;
  };

  auth: {
    persistSession(session: PersistedSession): Promise<void>;
    restoreSession(): Promise<PersistedSession | null>;
    clearSession(): Promise<void>;
  };

  processing: {
    getCapabilities(): Promise<ProcessingCapabilities>;
    analyzeAudio(input: AudioInput): Promise<JobReference>;
    analyzeArtwork(input: ArtworkInput): Promise<JobReference>;
    cancelJob(jobId: string): Promise<void>;
    generateAudio(input: GenerateAudioRequest): Promise<GenerateAudioResult>;
  };

  /** M9 — playback capabilities (dry HTML audio; no native DSP on play path). */
  playback: {
    getCapabilities(): Promise<PlaybackCapabilities>;
    bindMediaSession(controller: PlaybackController): () => void;
    /** Pause/resume dry playback on shell deactivation (not native audio focus). */
    bindPlaybackLifecycle(controller: PlaybackController): () => void;
    /** Android AudioManager focus → dry AudioBus pause/resume (no DSP). */
    bindAudioFocus(controller: PlaybackController): () => void;
  };

  notifications: {
    requestPermission(): Promise<boolean>;
    show(notification: VybzNotification): Promise<void>;
  };

  system: {
    openExternalUrl(url: string): Promise<void>;
    getDeviceInfo(): Promise<DeviceInformation>;
    getNetworkState(): Promise<NetworkState>;
  };

  sharing?: {
    receiveSharedFiles(): Promise<SharedImport[]>;
    shareExport(file: ExportedFile): Promise<void>;
  };
}
