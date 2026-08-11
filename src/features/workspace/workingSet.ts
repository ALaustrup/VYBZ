/**
 * OR-032 — shared song workspace working set.
 * One active track for Prepare desks (Correct / Translation Lab / Metadata).
 * Session-scoped; Analyzer pending blobs and local drops seed it.
 * Law 1: no invented readiness — only media refs + labels we have.
 */

export type WorkingTrackSource = "analyzer" | "library" | "tool-drop" | "landing";

export type WorkingTrack = {
  id: string;
  title: string;
  artistName: string | null;
  fileName: string;
  mimeType: string;
  /** In-memory master for this session (Object URL consumers must not revoke). */
  blob: Blob;
  source: WorkingTrackSource;
  releaseId?: string;
  dropId?: string;
  setAt: number;
};

type Listener = () => void;

let current: WorkingTrack | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function getWorkingTrack(): WorkingTrack | null {
  return current;
}

export function subscribeWorkingTrack(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearWorkingTrack(): void {
  current = null;
  emit();
}

export function setWorkingTrack(input: Omit<WorkingTrack, "id" | "setAt"> & { id?: string }): WorkingTrack {
  current = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    artistName: input.artistName,
    fileName: input.fileName,
    mimeType: input.mimeType,
    blob: input.blob,
    source: input.source,
    releaseId: input.releaseId,
    dropId: input.dropId,
    setAt: Date.now(),
  };
  emit();
  return current;
}

/** File handle for tool desks that expect a File. */
export function workingTrackAsFile(track: WorkingTrack = current!): File | null {
  const t = track ?? current;
  if (!t) return null;
  if (t.blob instanceof File) return t.blob;
  return new File([t.blob], t.fileName, { type: t.mimeType || "audio/wav" });
}

/** Test seam. */
export function resetWorkingTrack(): void {
  current = null;
}
