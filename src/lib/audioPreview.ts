import { useEffect } from "react";
import { getSnapshot, stop } from "@/lib/audioBus";

export function stopAudioPreview(ownerPrefix: string) {
  if (getSnapshot().track?.id.startsWith(ownerPrefix)) stop();
}

/** Revoke a page-owned blob URL without leaving AudioBus pointed at dead media. */
export function useAudioPreviewUrlCleanup(
  url: string | null,
  ownerPrefix: string,
) {
  useEffect(() => {
    return () => {
      if (!url) return;
      const active = getSnapshot().track;
      if (active?.id.startsWith(ownerPrefix) && active.url === url) stop();
      URL.revokeObjectURL(url);
    };
  }, [ownerPrefix, url]);
}
