import { useEffect, useRef } from "react";
import { workingTrackAsFile, type WorkingTrack } from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";

/**
 * When the song workspace has a master and the desk has no local file yet,
 * hand the File to the desk once per working-track id.
 */
export function usePreloadWorkingAudio(
  onFile: (file: File) => void | Promise<void>,
  opts?: { enabled?: boolean; hasLocalFile?: boolean },
): WorkingTrack | null {
  const track = useWorkingTrack();
  const loadedId = useRef<string | null>(null);
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;
  const enabled = opts?.enabled !== false;
  const hasLocal = opts?.hasLocalFile === true;

  useEffect(() => {
    if (!enabled || hasLocal || !track) return;
    if (loadedId.current === track.id) return;
    const file = workingTrackAsFile(track);
    if (!file) return;
    loadedId.current = track.id;
    void onFileRef.current(file);
  }, [enabled, hasLocal, track]);

  return track;
}
