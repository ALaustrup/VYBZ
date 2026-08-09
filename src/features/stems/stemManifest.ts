/**
 * Stem set manifest — VYBZ Stem Maker V1 (OR-019 assembly).
 * Law 1: metrics are measured only; never invent loudness.
 */

export const STEM_SET_FORMAT = "vybz.stem-set.v1" as const;
export const STEM_MAKER_VERSION = "or019.stem-assemble.1";

export type StemMetricsSnapshot = {
  peakDbfs: number;
  rmsDbfs: number;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
};

export type StemManifestEntry = {
  role: string;
  fileName: string;
  sourceName: string;
  sha256: string;
  byteLength: number;
  metrics: StemMetricsSnapshot;
  corrections: string[];
};

export type StemSetManifest = {
  format: typeof STEM_SET_FORMAT;
  makerVersion: typeof STEM_MAKER_VERSION;
  title: string;
  createdAt: string;
  note: string;
  stems: StemManifestEntry[];
};

export function buildStemManifest(input: {
  title: string;
  stems: StemManifestEntry[];
  createdAt?: string;
}): StemSetManifest {
  return {
    format: STEM_SET_FORMAT,
    makerVersion: STEM_MAKER_VERSION,
    title: input.title.trim() || "untitled-stems",
    createdAt: input.createdAt ?? new Date().toISOString(),
    note:
      "Assembled from producer-exported stems. Metrics measured on-device. Not AI source separation. Not added to Library/catalog automatically. Not DSP delivery.",
    stems: input.stems,
  };
}

const ROLE_ALIASES: Record<string, string> = {
  vocal: "vocals",
  vox: "vocals",
  drum: "drums",
  kick: "drums",
  snare: "drums",
  perc: "percussion",
  percs: "percussion",
  instr: "instrumental",
  inst: "instrumental",
  music: "instrumental",
};

/** Infer a stem role label from a filename (heuristic naming only). */
export function inferStemRole(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  const tokens = base.split(/[\s_\-.]+/).filter(Boolean);
  const known = new Set([
    "vocals",
    "drums",
    "bass",
    "other",
    "percussion",
    "instrumental",
    "melody",
    "fx",
    ...Object.keys(ROLE_ALIASES),
  ]);
  for (const token of tokens) {
    if (/^\d+$/.test(token)) continue;
    if (known.has(token) || ROLE_ALIASES[token]) {
      const mapped = ROLE_ALIASES[token] ?? token;
      return mapped.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stem";
    }
  }
  const fallback = tokens.find((t) => !/^\d+$/.test(t)) ?? "stem";
  return fallback.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stem";
}

export function stemWavFileName(role: string, index: number, used: Set<string>): string {
  let name = `${String(index + 1).padStart(2, "0")}_${role || "stem"}.wav`;
  let n = 2;
  while (used.has(name)) {
    name = `${String(index + 1).padStart(2, "0")}_${role || "stem"}_${n}.wav`;
    n += 1;
  }
  used.add(name);
  return name;
}
