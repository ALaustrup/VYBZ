/**
 * Filter DataTransfer / FileList into library-ingestible audio files.
 * No batch-size cap — callers queue sequentially.
 */

import { isAudioFile } from "@/lib/waveform";

export const LIBRARY_DROP_MAX_BYTES = 1024 * 1024 * 1024;

export function collectLibraryAudioFiles(
  list: FileList | File[] | null | undefined
): { files: File[]; skippedNonAudio: number; skippedEmpty: number; skippedOversize: number } {
  const incoming = list ? Array.from(list) : [];
  let skippedNonAudio = 0;
  let skippedEmpty = 0;
  let skippedOversize = 0;
  const files: File[] = [];
  for (const f of incoming) {
    if (!f || f.size <= 0) {
      skippedEmpty++;
      continue;
    }
    if (!isAudioFile(f)) {
      skippedNonAudio++;
      continue;
    }
    if (f.size > LIBRARY_DROP_MAX_BYTES) {
      skippedOversize++;
      continue;
    }
    files.push(f);
  }
  return { files, skippedNonAudio, skippedEmpty, skippedOversize };
}

/** True when a drag event carries files (not text / UI chrome). */
export function dragHasFiles(dt: DataTransfer | null | undefined): boolean {
  if (!dt?.types) return false;
  return Array.from(dt.types).includes("Files");
}
