/** Shared types + helpers for the VDock Visualizer Studio. */

export type StudioFit = "cover" | "contain";

export type ReactiveStyle =
  | "pulse"
  | "glow"
  | "bars"
  | "zoom"
  | "chroma"
  | "rings";

export interface StudioBands {
  bass: number;
  mid: number;
  high: number;
  level: number;
}

/** Canvas export target. 8K is opt-in experimental — may fail on device (Law 1: measure WxH). */
export type StudioResolutionId = "720p" | "1080p" | "1440p" | "2160p" | "4320p";

export type StudioLayers = {
  wash: boolean;
  rings: boolean;
  bars: boolean;
  vignette: boolean;
};

export interface StudioReactiveSettings {
  style: ReactiveStyle;
  /** Overall reactivity 0..1 */
  intensity: number;
  /** Bass-driven scale / zoom amount 0..1 */
  bassPunch: number;
  /** Color wash strength 0..1 */
  colorWash: number;
  /** Frequency bar opacity 0..1 */
  barAmount: number;
  /** Accent hex for overlays */
  accent: string;
  fit: StudioFit;
  /** Dim media under FX 0..1 */
  dim: number;
  /** Loop length for export (seconds) */
  loopSec: number;
  /** Canvas resolution preset */
  resolution: StudioResolutionId;
  /** Independent overlay layers */
  layers: StudioLayers;
}

export const STUDIO_RESOLUTIONS: Record<
  StudioResolutionId,
  { w: number; h: number; label: string; bitrate: number; experimental?: boolean }
> = {
  "720p": { w: 1280, h: 720, label: "720p (VDock)", bitrate: 2_500_000 },
  "1080p": { w: 1920, h: 1080, label: "1080p", bitrate: 6_000_000 },
  "1440p": { w: 2560, h: 1440, label: "1440p", bitrate: 12_000_000 },
  "2160p": { w: 3840, h: 2160, label: "4K", bitrate: 25_000_000 },
  "4320p": { w: 7680, h: 4320, label: "8K (experimental)", bitrate: 50_000_000, experimental: true },
};

export const DEFAULT_STUDIO_SETTINGS: StudioReactiveSettings = {
  style: "pulse",
  intensity: 0.7,
  bassPunch: 0.55,
  colorWash: 0.45,
  barAmount: 0.55,
  accent: "#00C2FF",
  fit: "cover",
  dim: 0.22,
  loopSec: 10,
  resolution: "1080p",
  layers: { wash: true, rings: true, bars: true, vignette: true },
};

export function studioSize(settings: StudioReactiveSettings): { w: number; h: number } {
  const r = STUDIO_RESOLUTIONS[settings.resolution] ?? STUDIO_RESOLUTIONS["720p"];
  return { w: r.w, h: r.h };
}

export const REACTIVE_STYLES: {
  id: ReactiveStyle;
  label: string;
  blurb: string;
}[] = [
  { id: "pulse", label: "Pulse", blurb: "Bass scales the frame" },
  { id: "glow", label: "Glow", blurb: "Color wash rides the mid" },
  { id: "bars", label: "Bars", blurb: "Spectrum over your media" },
  { id: "zoom", label: "Zoom", blurb: "Slow drift + kick zoom" },
  { id: "chroma", label: "Chroma", blurb: "Hue shifts with highs" },
  { id: "rings", label: "Rings", blurb: "Concentric level rings" },
];

export const STUDIO_W = 1280;
export const STUDIO_H = 720;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Draw cover/contain media into a rect. */
export function drawMediaFitted(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  mw: number,
  mh: number,
  dw: number,
  dh: number,
  fit: StudioFit,
  scale = 1,
) {
  if (!mw || !mh) return;
  const mediaRatio = mw / mh;
  const destRatio = dw / dh;
  let rw: number;
  let rh: number;
  if (fit === "contain") {
    if (mediaRatio > destRatio) {
      rw = dw * scale;
      rh = (dw / mediaRatio) * scale;
    } else {
      rh = dh * scale;
      rw = dh * mediaRatio * scale;
    }
  } else {
    if (mediaRatio > destRatio) {
      rh = dh * scale;
      rw = dh * mediaRatio * scale;
    } else {
      rw = dw * scale;
      rh = (dw / mediaRatio) * scale;
    }
  }
  const x = (dw - rw) / 2;
  const y = (dh - rh) / 2;
  ctx.drawImage(media, x, y, rw, rh);
}

/**
 * Composite one reactive frame onto `ctx` (already sized to STUDIO_W×STUDIO_H).
 */
export function renderStudioFrame(
  ctx: CanvasRenderingContext2D,
  opts: {
    media: CanvasImageSource | null;
    mediaW: number;
    mediaH: number;
    bands: StudioBands;
    freqs: Uint8Array | null;
    settings: StudioReactiveSettings;
    timeSec: number;
  },
) {
  const { media, mediaW, mediaH, bands, freqs, settings, timeSec } = opts;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const i = settings.intensity;
  const { r, g, b } = hexToRgb(settings.accent);

  ctx.fillStyle = "#060810";
  ctx.fillRect(0, 0, w, h);

  const punch = 1 + bands.bass * settings.bassPunch * i * 0.35;
  const drift =
    settings.style === "zoom"
      ? 1 + 0.04 * Math.sin(timeSec * 0.35) + bands.bass * settings.bassPunch * i * 0.2
      : punch;

  if (media && mediaW > 0 && mediaH > 0) {
    ctx.save();
    if (settings.style === "chroma") {
      const hue = bands.high * i * 80;
      ctx.filter = `hue-rotate(${hue}deg) saturate(${1 + bands.mid * i * 0.6})`;
    }
    drawMediaFitted(ctx, media, mediaW, mediaH, w, h, settings.fit, drift);
    ctx.restore();
  }

  if (settings.dim > 0) {
    ctx.fillStyle = `rgba(6,8,16,${settings.dim})`;
    ctx.fillRect(0, 0, w, h);
  }

  const layers = settings.layers ?? DEFAULT_STUDIO_SETTINGS.layers;
  const wash = settings.colorWash * i * (0.25 + bands.mid * 0.75);
  if (
    layers.wash &&
    wash > 0.01 &&
    (settings.style === "glow" || settings.style === "pulse" || settings.style === "chroma")
  ) {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.5, w * 0.7);
    grad.addColorStop(0, `rgba(${r},${g},${b},${wash * 0.55})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  if (
    layers.rings &&
    (settings.style === "rings" || (settings.style === "pulse" && settings.barAmount > 0.15))
  ) {
    const rings = 4;
    for (let n = 0; n < rings; n++) {
      const t = (n + 1) / rings;
      const rad = (Math.min(w, h) * 0.18) * t * (1 + bands.level * i * 0.5);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - t) * 0.45 * i * (0.4 + bands.level)})`;
      ctx.lineWidth = 2 + bands.bass * 4 * i;
      ctx.stroke();
    }
  }

  const showBars =
    layers.bars &&
    (settings.style === "bars" || (settings.barAmount > 0.05 && settings.style !== "rings"));
  if (showBars && freqs && freqs.length) {
    const bars = 48;
    const gap = 2;
    const barW = (w - gap * (bars - 1)) / bars;
    const alpha = settings.barAmount * i * (settings.style === "bars" ? 1 : 0.55);
    for (let bi = 0; bi < bars; bi++) {
      const bin = Math.floor((bi / bars) * freqs.length * 0.55);
      const level = Math.max(0.04, Math.min(1, (freqs[bin] / 255) ** 0.85));
      const bh = level * h * 0.55 * (0.5 + settings.intensity * 0.5);
      const x = bi * (barW + gap);
      const y = h - bh;
      const grad = ctx.createLinearGradient(x, y, x, h);
      grad.addColorStop(0, `rgba(${r},${g},${b},${0.75 * alpha})`);
      grad.addColorStop(1, `rgba(0,214,143,${0.35 * alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, bh);
    }
  }

  if (layers.vignette) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Prefer vp9/webm, fall back to mp4/h264, then bare webm. */
export function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

export function extForMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

/**
 * Record a muted reactive loop from an offscreen (or visible) canvas.
 * Music is used only to drive analyser during capture — not muxed into the file.
 */
export async function recordStudioLoop(opts: {
  canvas: HTMLCanvasElement;
  durationSec: number;
  onProgress?: (pct: number) => void;
  /** Target encode bitrate; defaults from canvas size class. */
  videoBitsPerSecond?: number;
}): Promise<Blob> {
  const { canvas, durationSec, onProgress } = opts;
  const mime = pickRecorderMime();
  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];
  const bits =
    opts.videoBitsPerSecond ??
    (canvas.width >= 3840 ? 25_000_000 : canvas.width >= 1920 ? 6_000_000 : 2_500_000);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits });

  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      onProgress?.(Math.min(99, Math.round((elapsed / durationSec) * 100)));
      if (elapsed < durationSec && rec.state === "recording") {
        requestAnimationFrame(tick);
      }
    };

    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onerror = () => reject(new Error("Recording failed"));
    rec.onstop = () => {
      onProgress?.(100);
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: mime }));
    };

    try {
      rec.start(200);
      requestAnimationFrame(tick);
      window.setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, Math.max(1000, durationSec * 1000 + 120));
    } catch (err) {
      reject(err);
    }
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const DRAFT_KEY = "vybz.visualizerStudio.draft";

export function saveStudioDraftMeta(meta: {
  style: ReactiveStyle;
  intensity: number;
  bassPunch: number;
  colorWash: number;
  barAmount: number;
  accent: string;
  fit: StudioFit;
  dim: number;
  loopSec: number;
}) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

export function loadStudioDraftMeta(): Partial<StudioReactiveSettings> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StudioReactiveSettings>;
  } catch {
    return null;
  }
}
