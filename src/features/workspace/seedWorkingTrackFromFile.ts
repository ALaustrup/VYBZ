/**
 * OR-040 — seed song workspace from a real File (Library or Landing ingest).
 * Law 1: title/artist from measured tags or filename only — no invented metrics.
 */

import { titleFromFilename } from "@/lib/id3Tags";
import {
  setWorkingTrack,
  type WorkingTrack,
  type WorkingTrackSource,
} from "@/features/workspace/workingSet";

export function seedWorkingTrackFromFile(opts: {
  file: File;
  source: WorkingTrackSource;
  dropId?: string;
  title?: string | null;
  artistName?: string | null;
}): WorkingTrack {
  const title =
    (opts.title?.trim() || titleFromFilename(opts.file.name) || opts.file.name).slice(0, 80);
  return setWorkingTrack({
    title,
    artistName: opts.artistName?.trim() || null,
    fileName: opts.file.name,
    mimeType: opts.file.type || "audio/wav",
    blob: opts.file,
    source: opts.source,
    dropId: opts.dropId,
  });
}
