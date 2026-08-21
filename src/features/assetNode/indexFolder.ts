import { shouldSkipDir, shouldSkipFile } from "@/lib/repoSync";
import type { CreatorNodeRecord, IndexedAssetRecord, WalkFile } from "@/features/assetNode/types";

/** Hard cap so indexing a huge tree stays a catalog, not a hang. */
export const MAX_INDEXED_FILES = 4000;
export const MAX_INDEX_DEPTH = 12;

const AUDIO_EXT = new Set(["wav", "aiff", "aif", "flac", "mp3", "m4a", "ogg", "opus", "aac", "bwf"]);

const MIME_BY_EXT: Record<string, string> = {
  wav: "audio/wav",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  flac: "audio/flac",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  opus: "audio/opus",
  aac: "audio/aac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  json: "application/json",
};

export function extOf(name: string): string {
  const base = name.toLowerCase();
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1) : "";
}

export function mimeFromName(name: string, reported = ""): string {
  if (reported) return reported;
  return MIME_BY_EXT[extOf(name)] ?? "application/octet-stream";
}

export function isAudioAsset(mime: string, name: string): boolean {
  if (mime.startsWith("audio/")) return true;
  return AUDIO_EXT.has(extOf(name));
}

/** Ableton caches that stall a metadata walk (Freeze, Processed). Backup is already skipped. */
const INDEX_SKIP_DIRS = new Set(["freeze", "frozen", "crashes", "crash", "processed"]);

export function shouldIndexDir(name: string): boolean {
  if (shouldSkipDir(name)) return false;
  return !INDEX_SKIP_DIRS.has(name.toLowerCase());
}

export function shouldIndexFile(name: string): boolean {
  return !shouldSkipFile(name);
}

/**
 * Build a local catalog from already-walked metadata.
 * Does not upload, hash, or copy bytes. Indexing is not publishing.
 */
export function buildLocalIndex(
  folderName: string,
  files: WalkFile[],
  now = Date.now(),
  newId: () => string = () => crypto.randomUUID(),
  availability: IndexedAssetRecord["availability"] = "local-only",
): { node: CreatorNodeRecord; assets: IndexedAssetRecord[] } {
  const kept = files.slice(0, MAX_INDEXED_FILES);
  const nodeId = newId();
  const assets: IndexedAssetRecord[] = kept.map((file) => ({
    id: newId(),
    nodeId,
    relativePath: file.relativePath.replace(/\\/g, "/"),
    name: file.name,
    mime: mimeFromName(file.name, file.mime),
    sizeBytes: file.sizeBytes,
    lastModified: file.lastModified,
    availability,
  }));
  const node: CreatorNodeRecord = {
    id: nodeId,
    name: folderName,
    indexedAt: now,
    fileCount: assets.length,
    totalBytes: assets.reduce((n, a) => n + a.sizeBytes, 0),
    availability,
  };
  return { node, assets };
}
