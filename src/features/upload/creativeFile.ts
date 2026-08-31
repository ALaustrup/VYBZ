import { isVideoFile } from "@/lib/audioEdit";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { classifyUrl, type WorkKind } from "@/features/profile/workKind";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"]);
const FILE_EXT = new Set(["zip", "pdf", "epub", "gz", "tgz", "7z"]);

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Picker accept list — Creative Work, not audio-only. */
export const CREATIVE_ACCEPT = `${AUDIO_ACCEPT},image/*,.png,.jpg,.jpeg,.gif,.webp,.avif,.svg,.pdf,.epub,.7z`;

export function isImageFile(file: File): boolean {
  if ((file.type || "").startsWith("image/")) return true;
  return IMAGE_EXT.has(extOf(file.name));
}

export function isDocumentFile(file: File): boolean {
  const type = file.type || "";
  if (
    type === "application/pdf" ||
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/epub+zip" ||
    type === "application/gzip" ||
    type === "application/x-7z-compressed"
  ) {
    return true;
  }
  return FILE_EXT.has(extOf(file.name));
}

/** Audio, image, video, or an allowed document/archive. Not a catch-all. */
export function isIngestibleCreativeFile(file: File): boolean {
  return isAudioFile(file) || isVideoFile(file) || isImageFile(file) || isDocumentFile(file);
}

export function classifyFile(file: File): WorkKind {
  if (isImageFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  if (isAudioFile(file)) return "audio";
  if (isDocumentFile(file)) return "file";
  return classifyUrl(file.name);
}
