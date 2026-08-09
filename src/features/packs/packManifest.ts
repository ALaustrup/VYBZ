/** Sample pack V1 manifest — OR-020 assembly. */

export const PACK_MAKER_VERSION = "or020.pack-assemble.1";

export type PackSampleKind = "oneshot" | "loop" | "other";

export type PackSampleMetrics = {
  peakDbfs: number;
  rmsDbfs: number;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
};

export type PackManifestEntry = {
  fileName: string;
  sourceName: string;
  kind: PackSampleKind;
  metrics: PackSampleMetrics;
  sha256: string;
};

export type PackManifest = {
  version: typeof PACK_MAKER_VERSION;
  title: string;
  createdAt: string;
  samples: PackManifestEntry[];
};

export function inferSampleKind(name: string): PackSampleKind {
  const n = name.toLowerCase().replace(/[_\-.]+/g, " ");
  if (/\b(loop|lp|phrase)\b/.test(n)) return "loop";
  if (/\b(hit|oneshot|one shot|kick|snare|hat|perc)\b/.test(n)) return "oneshot";
  return "other";
}

export function packFolderForKind(kind: PackSampleKind): string {
  if (kind === "loop") return "loops";
  if (kind === "oneshot") return "oneshots";
  return "samples";
}

export function buildPackManifest(opts: {
  title: string;
  samples: PackManifestEntry[];
}): PackManifest {
  return {
    version: PACK_MAKER_VERSION,
    title: opts.title.trim() || "untitled-pack",
    createdAt: new Date().toISOString(),
    samples: opts.samples,
  };
}
