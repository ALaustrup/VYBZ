/**
 * Holds the audio a readiness scan just analysed, so the user can choose to
 * publish it afterwards.
 *
 * The scan is deliberately on-device: `createReleaseWithScan` stores measurements
 * and never the file. That keeps the "no cloud upload during the scan" promise on
 * the landing page, but it also means the audio is gone the moment the tab
 * reloads. This module keeps the blob in memory for the length of the session so
 * "Publish to your catalog" can offer a real upload without a second file picker.
 *
 * Deliberately not persisted. A reload clears it, and the UI says so rather than
 * offering an action that would fail.
 */

export type PendingAudio = {
  releaseId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  sampleRate?: number;
  audioFormat?: string;
  lossless?: boolean;
  title: string;
  artistName: string | null;
};

const pending = new Map<string, PendingAudio>();

/** Cap the number of retained blobs so a long session cannot grow without bound. */
const MAX_RETAINED = 3;

export function stashPendingAudio(entry: PendingAudio): void {
  pending.set(entry.releaseId, entry);
  while (pending.size > MAX_RETAINED) {
    const oldest = pending.keys().next().value;
    if (oldest === undefined) break;
    pending.delete(oldest);
  }
}

export function peekPendingAudio(releaseId: string): PendingAudio | null {
  return pending.get(releaseId) ?? null;
}

/** Read and remove — call once the upload has succeeded. */
export function clearPendingAudio(releaseId: string): void {
  pending.delete(releaseId);
}

/** Test seam. */
export function resetPendingAudio(): void {
  pending.clear();
}
