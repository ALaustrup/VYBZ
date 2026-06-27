// Media pipeline for MYVYB posts.
//
// Images: accept any format the browser can decode and re-encode to WebP (the
// best widely-encodable web format) at high quality and resolution. (AVIF/AV1
// renditions are a future server-side step — in-browser AVIF/AV1 encoding isn't
// reliably available and would require COEP isolation that breaks our other
// cross-origin assets.)
//
// Video: accept any format the device can play. We do a NON-DESTRUCTIVE
// "virtual trim" — store the original and only play the chosen window (up to
// 1:20 for members) — so it works instantly for any size/codec and on iOS.

/** Baseline playable clip length, in seconds (standard members): 1:20. */
export const MAX_CLIP_SECONDS = 80;

/**
 * Per-file upload ceiling, in bytes. This is the CLIENT guard; the real ceiling
 * is `min(this, Supabase project global upload limit, confessions bucket
 * file_size_limit)`. We set this generously so true high-resolution clips (up to
 * 8K) are accepted by the app — the storage layer is the final gate, and any
 * server-side rejection is now surfaced verbatim (see backend.uploadConfessionMedia)
 * instead of failing silently. To actually accept very large files end-to-end,
 * raise the project's global upload size limit in the Supabase dashboard
 * (Storage → Settings) and the `confessions` bucket `file_size_limit`
 * (see migration 20260627_0001_media_limits.sql).
 */
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024; // 512 MB

/** Client guard for images. WebP transcode keeps even 8K stills well under this. */
export const MAX_IMAGE_BYTES = 64 * 1024 * 1024; // 64 MB

/**
 * Longest edge we keep for uploaded stills. 7680 == 8K width, so 8K photos are
 * preserved at full resolution; only larger-than-8K sources are downscaled.
 */
export const MAX_IMAGE_DIMENSION = 7680;

/**
 * Max clip length by tier: standard members get 1:20 (80s), Godmode gets a
 * longer 3:00 window. The per-file storage cap still applies, so very high-res
 * long clips are rejected.
 */
export function maxClipSeconds(premium: boolean): number {
  return premium ? 180 : MAX_CLIP_SECONDS;
}

export interface ProcessedImage {
  /** Data URL (WebP when supported, else JPEG) for instant preview. */
  dataUrl: string;
  /** Encoded blob, ready to upload. */
  blob: Blob;
  width: number;
  height: number;
}

export interface VideoMeta {
  duration: number;
  width: number;
  height: number;
}

function canEncodeWebP(): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Convert any decodable image to a high-quality WebP (JPEG fallback), preserving
 * full resolution up to 8K. We only downscale sources larger than `maxDimension`.
 *
 * Robustness: re-encoding a true 8K still can exceed a mobile GPU/canvas memory
 * budget, so we try the requested dimension first and progressively fall back to
 * smaller canvases. If the browser can't decode the file at all (e.g. an exotic
 * codec), we upload the ORIGINAL bytes untouched rather than throwing — so the
 * upload never silently dies on the user.
 */
export async function processImage(
  file: Blob,
  maxDimension = MAX_IMAGE_DIMENSION,
  quality = 0.92
): Promise<ProcessedImage> {
  let dataUrl: string;
  let img: HTMLImageElement;
  try {
    dataUrl = await readAsDataURL(file);
    img = await loadImage(dataUrl);
  } catch {
    // Undecodable in this browser — keep the original so the upload still works.
    return passthroughImage(file);
  }

  const type = canEncodeWebP() ? "image/webp" : "image/jpeg";
  // Try the requested size, then step down if the canvas/encoder runs out of room.
  const longest = Math.max(img.width, img.height);
  const ladder = [maxDimension, 4096, 3072, 2160].filter(
    (d, i, arr) => arr.indexOf(d) === i && d > 0
  );

  for (const dim of ladder) {
    const scale = Math.min(1, dim / longest);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      // High-quality resampling for crisp downscales.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), type, quality)
      );
      if (!blob || blob.size === 0) continue;
      const out = canvas.toDataURL(type, quality);
      return { dataUrl: out, blob, width: w, height: h };
    } catch {
      // Try the next (smaller) rung.
    }
  }
  // Every encode attempt failed — fall back to the original bytes.
  return passthroughImage(file, dataUrl, img.width, img.height);
}

/** Upload the original image bytes unchanged (used when re-encoding isn't possible). */
async function passthroughImage(
  file: Blob,
  knownDataUrl?: string,
  width = 0,
  height = 0
): Promise<ProcessedImage> {
  const dataUrl = knownDataUrl ?? (await readAsDataURL(file).catch(() => ""));
  return { dataUrl: dataUrl || "", blob: file, width, height };
}

/** Probe a video file for duration + dimensions (no upload, no decode of frames). */
export function probeVideo(file: Blob): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      const meta = {
        duration: v.duration || 0,
        width: v.videoWidth || 0,
        height: v.videoHeight || 0,
      };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video"));
    };
    v.src = url;
  });
}

/** Fetch a remote URL (e.g. an AI image) into a Blob, when CORS permits. */
export async function fetchToBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** True for files we treat as video. */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}
