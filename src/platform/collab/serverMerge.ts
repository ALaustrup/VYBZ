/**
 * Conflict-safe merge for release metadata.
 * Local/e2e: in-memory versioned docs. Remote: RPC merge_release_metadata when available.
 */

import {
  mergeReleaseMetadataLocal,
  type MergePatch,
  type MergeResult,
} from "@vybz/domain/collab";

type Doc = { title: string; artist_name: string | null; rowVersion: number };

const docs = new Map<string, Doc>();
/** Last version the local client successfully applied (stale across remote bumps). */
const clientBase = new Map<string, number>();

export function getLocalReleaseDoc(releaseId: string): Doc {
  let d = docs.get(releaseId);
  if (!d) {
    d = { title: "Untitled", artist_name: null, rowVersion: 1 };
    docs.set(releaseId, d);
  }
  return { ...d };
}

export function setLocalReleaseDoc(releaseId: string, doc: Doc): void {
  docs.set(releaseId, { ...doc });
}

export function getClientBaseVersion(releaseId: string): number {
  const existing = clientBase.get(releaseId);
  if (existing != null) return existing;
  const v = getLocalReleaseDoc(releaseId).rowVersion;
  clientBase.set(releaseId, v);
  return v;
}

export function setClientBaseVersion(releaseId: string, v: number): void {
  clientBase.set(releaseId, v);
}

export function resetLocalMergeDocs(): void {
  docs.clear();
  clientBase.clear();
}

export function mergeReleaseMetadataLocalStore(
  releaseId: string,
  expectedVersion: number,
  patch: MergePatch
): MergeResult {
  const current = getLocalReleaseDoc(releaseId);
  const result = mergeReleaseMetadataLocal({ current, expectedVersion, patch });
  if (result.status === "applied") {
    setLocalReleaseDoc(releaseId, {
      title: patch.title ?? current.title,
      artist_name:
        patch.artist_name !== undefined ? patch.artist_name : current.artist_name,
      rowVersion: result.rowVersion,
    });
  }
  return result;
}

/** Attempt Supabase RPC; fall back to local store. */
export async function mergeReleaseMetadata(
  releaseId: string,
  expectedVersion: number,
  patch: MergePatch
): Promise<MergeResult> {
  try {
    const { supabase } = await import("@/lib/supabase");
    if (supabase) {
      const { data, error } = await supabase.rpc("merge_release_metadata", {
        p_release_id: releaseId,
        p_expected_version: expectedVersion,
        p_patch: patch,
      });
      if (!error && data && typeof data === "object") {
        const row = data as Record<string, unknown>;
        if (row.status === "applied") {
          return { status: "applied", rowVersion: Number(row.row_version) || expectedVersion + 1 };
        }
        if (row.status === "conflict") {
          const current = (row.current ?? {}) as MergePatch;
          return {
            status: "conflict",
            rowVersion: Number(row.row_version) || expectedVersion,
            current,
            patch,
          };
        }
      }
    }
  } catch {
    /* local fallback */
  }
  return mergeReleaseMetadataLocalStore(releaseId, expectedVersion, patch);
}
