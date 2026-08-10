/** Shared cross-client contracts — Phase 1.5. No platform imports. */

export type PlatformKind = "web" | "desktop" | "android" | "ios";

export type ShellMode = PlatformKind;

export interface SelectedFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Blob/File for upload pipelines; may be absent for path-only native picks. */
  blob?: Blob;
  /** Native absolute path — desktop only; never log or sync raw paths. */
  localPath?: string;
  lastModified?: number;
}

export interface SelectedFolder {
  id: string;
  name: string;
  localPath?: string;
}

export interface ExportedFile {
  name: string;
  mimeType: string;
  blob: Blob;
  suggestedPath?: string;
}

export interface PersistedSession {
  /** Opaque serialized session payload (e.g. Supabase session JSON). */
  payload: string;
  updatedAt: string;
}

export interface ProcessingCapabilities {
  portableAudioInspect: boolean;
  portableArtworkInspect: boolean;
  nativeBatchAudio: boolean;
  nativeTranscode: boolean;
  remoteJobs: boolean;
  maxLocalFileBytes: number;
  offlineDrafts: boolean;
}

/** M9 — playback capability surface (Law 5). No hidden DSP on the play element. */
export interface PlaybackCapabilities {
  /** Shared WebView HTMLAudioElement path — dry output. */
  dryHtmlAudio: boolean;
  /** Runtime support for wired OS media-session / lock-screen controls. */
  mediaSession: boolean;
  /** App/page deactivation pause+resume binding (not native AudioManager focus). */
  playbackLifecycle: boolean;
  /**
   * Native audio-focus ducking / call interrupt (AudioManager / AVAudioSession).
   * Stays false until a disclosed native adapter ships — do not claim phone-call
   * focus handling without measuring it on device.
   */
  audioFocus: boolean;
  /** Native DSP graph on the play path (must stay false until disclosed). */
  nativeDsp: boolean;
}

export interface PlaybackMediaState {
  track: {
    title: string;
    artist: string;
    album?: string;
    durationSec?: number;
  } | null;
  playing: boolean;
  currentTime: number;
  duration: number;
}

/** Platform-neutral transport consumed by OS media-control adapters. */
export interface PlaybackController {
  getState(): PlaybackMediaState;
  subscribe(listener: () => void): () => void;
  play(): void | Promise<void>;
  pause(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
}

export interface AudioInput {
  file: SelectedFile;
  projectId?: string;
  idempotencyKey?: string;
}

export interface ArtworkInput {
  file: SelectedFile;
  projectId?: string;
  idempotencyKey?: string;
}

export interface JobReference {
  jobId: string;
  status: "queued" | "processing" | "succeeded" | "failed" | "canceled";
  engine: "portable" | "native" | "remote";
  createdAt: string;
  /** Optional analysis payload when the job completes inline (portable/native). */
  result?: Record<string, unknown>;
}

export interface VybzNotification {
  title: string;
  body: string;
  href?: string;
}

export interface DeviceInformation {
  platform: PlatformKind;
  userAgent: string;
  locale: string;
  online: boolean;
}

export type NetworkState = "online" | "offline" | "unknown";

export interface SharedImport {
  id: string;
  name: string;
  mimeType: string;
  blob?: Blob;
}
