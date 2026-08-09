/** Sample pack V1+ manifest — OR-020 assembly. */

export const PACK_MAKER_VERSION = "or020.pack-assemble.2";

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
  /** SHA-256 of sorted sample sha256 lines — content fingerprint (Law 1). */
  contentSha256: string;
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

export async function contentShaFromSampleHashes(hashes: string[]): Promise<string> {
  const joined = [...hashes].sort().join("\n");
  const data = new TextEncoder().encode(joined);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildPackManifest(opts: {
  title: string;
  samples: PackManifestEntry[];
}): Promise<PackManifest> {
  const contentSha256 = await contentShaFromSampleHashes(opts.samples.map((s) => s.sha256));
  return {
    version: PACK_MAKER_VERSION,
    title: opts.title.trim() || "untitled-pack",
    createdAt: new Date().toISOString(),
    contentSha256,
    samples: opts.samples,
  };
}
