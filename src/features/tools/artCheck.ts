/**
 * Artwork validation + fix helpers (Art Check). Law 1: only measured pixels.
 */

export type ArtFileSizeVerdict = "pass" | "warn" | "fail";

export type ArtCheckResult = {
  width: number;
  height: number;
  square: boolean;
  minEdge: number;
  meetsStoreMin: boolean; // ≥ 3000 on both edges
  fileBytes: number;
  /** VYBZ guidance vs common store upload soft caps — not a DSP submission claim. */
  fileSizeVerdict: ArtFileSizeVerdict;
  mimeType: string;
  meanLuma: number; // 0..1
  needsBrighten: boolean;
};

export const ART_STORE_MIN_PX = 3000;
export const ART_TARGET_PX = 3000;
/** Mean luma below this suggests a lift may help visibility. */
export const ART_DIM_LUMA = 0.22;
/** Soft warn when file is large for common store uploads (VYBZ guidance). */
export const ART_FILE_WARN_BYTES = 8 * 1024 * 1024;
/** Soft fail-style severity at typical ~10 MiB upload caps (VYBZ guidance). */
export const ART_FILE_FAIL_BYTES = 10 * 1024 * 1024;

export function artFileSizeVerdict(fileBytes: number): ArtFileSizeVerdict {
  if (fileBytes >= ART_FILE_FAIL_BYTES) return "fail";
  if (fileBytes >= ART_FILE_WARN_BYTES) return "warn";
  return "pass";
}

export async function probeArtworkFile(file: File): Promise<ArtCheckResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const minEdge = Math.min(width, height);
    const canvas = document.createElement("canvas");
    const sample = Math.min(64, width, height);
    canvas.width = sample;
    canvas.height = sample;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, sample, sample);
    const { data } = ctx.getImageData(0, 0, sample, sample);
    let sum = 0;
    const n = sample * sample;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]! / 255;
      const g = data[i + 1]! / 255;
      const b = data[i + 2]! / 255;
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const meanLuma = sum / n;
    return {
      width,
      height,
      square: width === height,
      minEdge,
      meetsStoreMin: width >= ART_STORE_MIN_PX && height >= ART_STORE_MIN_PX,
      fileBytes: file.size,
      fileSizeVerdict: artFileSizeVerdict(file.size),
      mimeType: file.type || "image/*",
      meanLuma,
      needsBrighten: meanLuma < ART_DIM_LUMA,
    };
  } finally {
    bitmap.close();
  }
}

export type ArtFixOptions = {
  targetPx?: number;
  brighten?: boolean;
  /** Pad (letterbox) instead of center-crop when non-square. */
  pad?: boolean;
};

/** Produce a square PNG at target size; optional brighten. */
export async function fixArtworkFile(
  file: File,
  opts: ArtFixOptions = {}
): Promise<Blob> {
  const target = opts.targetPx ?? ART_TARGET_PX;
  const brighten = opts.brighten ?? false;
  const pad = opts.pad ?? true;
  const bitmap = await createImageBitmap(file);
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, target, target);

    if (pad) {
      const scale = Math.min(target / srcW, target / srcH);
      const dw = Math.round(srcW * scale);
      const dh = Math.round(srcH * scale);
      const dx = Math.floor((target - dw) / 2);
      const dy = Math.floor((target - dh) / 2);
      ctx.drawImage(bitmap, dx, dy, dw, dh);
    } else {
      const side = Math.min(srcW, srcH);
      const sx = Math.floor((srcW - side) / 2);
      const sy = Math.floor((srcH - side) / 2);
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
    }

    if (brighten) {
      const img = ctx.getImageData(0, 0, target, target);
      const d = img.data;
      const gain = 1.18;
      const lift = 12;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i]! * gain + lift);
        d[i + 1] = Math.min(255, d[i + 1]! * gain + lift);
        d[i + 2] = Math.min(255, d[i + 2]! * gain + lift);
      }
      ctx.putImageData(img, 0, 0);
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
        "image/png"
      );
    });
  } finally {
    bitmap.close();
  }
}
