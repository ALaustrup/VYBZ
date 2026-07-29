/** Shared cross-client contracts — Phase 1.5. No platform imports. */

export type PlatformKind = "web" | "desktop" | "android";

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
