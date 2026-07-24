import type { PostFx } from "@/types";
import { paletteFor } from "@/lib/utils";

/** Uploader-defined Orb + outline vision stored on drops/assets. */
export interface PlaybackCustomization {
  /** 2–4 hex colors driving Orb body + outline palette. */
  orbPalette?: string[];
  /** Maps to drops.fx / Orb morph style while the track plays. */
  reactiveStyle?: PostFx;
  orbEffects?: {
    /** Bass pulse amplitude scale 0..1 (default ~0.55). */
    pulseScale?: number;
    /** Outer rim strength 0..1 (default ~0.5). */
    rimIntensity?: number;
    /** Pointer-follow specular highlight (default true). */
    specularFollow?: boolean;
  };
  /** Optional visual seed override (falls back to drops.seed). */
  seed?: number;
}

export interface ResolvedPlaybackVisuals {
  palette: string[];
  accent: string;
  seed: number;
  fx: PostFx;
  pulseScale: number;
  rimIntensity: number;
  specularFollow: boolean;
  customization: PlaybackCustomization;
}

const FX_SET = new Set<PostFx>(["off", "glow", "aurora", "pulse", "bars", "ripple"]);

export function parsePlaybackCustomization(raw: unknown): PlaybackCustomization {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: PlaybackCustomization = {};
  if (Array.isArray(o.orbPalette)) {
    const colors = o.orbPalette
      .filter((c): c is string => typeof c === "string" && /^#?[0-9a-fA-F]{6}$/.test(c.trim()))
      .map((c) => (c.startsWith("#") ? c : `#${c}`))
      .slice(0, 4);
    if (colors.length >= 2) out.orbPalette = colors;
  }
  if (typeof o.reactiveStyle === "string" && FX_SET.has(o.reactiveStyle as PostFx)) {
    out.reactiveStyle = o.reactiveStyle as PostFx;
  }
  if (o.orbEffects && typeof o.orbEffects === "object" && !Array.isArray(o.orbEffects)) {
    const e = o.orbEffects as Record<string, unknown>;
    const orbEffects: NonNullable<PlaybackCustomization["orbEffects"]> = {};
    if (typeof e.pulseScale === "number") orbEffects.pulseScale = clamp01(e.pulseScale);
    if (typeof e.rimIntensity === "number") orbEffects.rimIntensity = clamp01(e.rimIntensity);
    if (typeof e.specularFollow === "boolean") orbEffects.specularFollow = e.specularFollow;
    if (Object.keys(orbEffects).length) out.orbEffects = orbEffects;
  }
  if (typeof o.seed === "number" && Number.isFinite(o.seed)) out.seed = Math.floor(o.seed);
  return out;
}

export function buildPlaybackCustomization(partial: PlaybackCustomization, fx: PostFx): PlaybackCustomization {
  const reactiveStyle = partial.reactiveStyle ?? fx;
  const out: PlaybackCustomization = { reactiveStyle };
  if (partial.orbPalette?.length) out.orbPalette = partial.orbPalette.slice(0, 4);
  if (partial.orbEffects) out.orbEffects = { ...partial.orbEffects };
  if (typeof partial.seed === "number") out.seed = partial.seed;
  return out;
}

/** Resolve uploader vision for the active PlayerTrack (listener prefs never win). */
export function resolvePlaybackVisuals(input: {
  seed?: number | null;
  accent?: string | null;
  fx?: string | null;
  playback?: PlaybackCustomization | null;
}): ResolvedPlaybackVisuals {
  const customization = parsePlaybackCustomization(input.playback ?? {});
  const seed = customization.seed ?? input.seed ?? 1;
  const seeded = paletteFor(seed);
  const palette =
    customization.orbPalette && customization.orbPalette.length >= 2
      ? padPalette(customization.orbPalette, seeded)
      : [input.accent || seeded[0], seeded[0], seeded[1], seeded[2]];
  const accent = palette[0];
  const fxRaw = customization.reactiveStyle ?? input.fx ?? "glow";
  const fx = FX_SET.has(fxRaw as PostFx) ? (fxRaw as PostFx) : "glow";
  const pulseScale = customization.orbEffects?.pulseScale ?? 0.55;
  const rimIntensity = customization.orbEffects?.rimIntensity ?? 0.5;
  const specularFollow = customization.orbEffects?.specularFollow ?? true;
  return { palette, accent, seed, fx, pulseScale, rimIntensity, specularFollow, customization };
}

function padPalette(colors: string[], fallback: string[]): string[] {
  const out = [...colors];
  let i = 0;
  while (out.length < 4) {
    out.push(fallback[i % fallback.length] ?? "#a87cf8");
    i += 1;
  }
  return out.slice(0, 4);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Curated Orb palettes for the Compose customization panel. */
export const ORB_PALETTE_PRESETS: { id: string; label: string; colors: string[] }[] = [
  { id: "veil", label: "Veil", colors: ["#c4a4ff", "#a87cf8", "#6b4bb8", "#2a1f3d"] },
  { id: "ember", label: "Ember", colors: ["#ffb347", "#ff6b4a", "#c43d2e", "#2a1410"] },
  { id: "tide", label: "Tide", colors: ["#7ee7ff", "#3db8e8", "#1a6fa0", "#0d1f2a"] },
  { id: "neon", label: "Neon", colors: ["#f0ff5a", "#39ff14", "#00c2ff", "#120a1f"] },
  { id: "mono", label: "Mono", colors: ["#f5f5f5", "#a0a0a0", "#505050", "#121212"] },
];
