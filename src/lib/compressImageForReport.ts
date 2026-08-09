const MAX_EDGE = 1280;
const MAX_DATA_URL_CHARS = 220_000; /* ~165KB — stays under typical RPC body comfort */

/**
 * Compress an image File to a JPEG data URL for bug-report context.
 * Returns null when the result would still be too large.
 */
export async function compressImageForReport(file: File): Promise<{ dataUrl: string; name: string } | null> {
  if (!file.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    let quality = 0.72;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.4) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length > MAX_DATA_URL_CHARS) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "screenshot";
    return { dataUrl, name: `${base}.jpg` };
  } finally {
    bitmap.close();
  }
}
