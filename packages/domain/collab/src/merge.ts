import type { MergePatch, MergeResult } from "./types";

/** Pure optimistic-concurrency merge used by unit tests + local/e2e store. */
export function mergeReleaseMetadataLocal(opts: {
  current: { title: string; artist_name: string | null; rowVersion: number };
  expectedVersion: number;
  patch: MergePatch;
}): MergeResult {
  if (opts.current.rowVersion !== opts.expectedVersion) {
    return {
      status: "conflict",
      rowVersion: opts.current.rowVersion,
      current: {
        title: opts.current.title,
        artist_name: opts.current.artist_name,
      },
      patch: opts.patch,
    };
  }
  return { status: "applied", rowVersion: opts.current.rowVersion + 1 };
}

export function peerColor(userId: string): string {
  const palette = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}
