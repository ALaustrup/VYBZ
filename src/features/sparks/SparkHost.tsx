import { useEffect, useState } from "react";
import { usePlayerShell } from "@/lib/audioBus";
import { useSession } from "@/store/session";
import { listSparks } from "./sparkApi";
import type { Spark } from "./sparkEngine";
import { SparkOverlay } from "./SparkOverlay";

/**
 * Loads the prompts for whatever is playing and mounts the overlay.
 *
 * Subscribes to the shell snapshot rather than the full player, so it does not
 * re-render on every `timeupdate` — the overlay reads the clock itself.
 */
export function SparkHost() {
  const { track } = usePlayerShell();
  const { userId } = useSession();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const trackId = track?.id ?? null;

  useEffect(() => {
    // Answering is attributed to an account, so there is nothing to show a guest.
    if (!trackId || !userId) {
      setSparks([]);
      setLoadedFor(null);
      return;
    }
    if (loadedFor === trackId) return;

    let cancelled = false;
    void (async () => {
      const found = await listSparks(trackId);
      if (cancelled) return;
      setSparks(found);
      setLoadedFor(trackId);
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId, userId, loadedFor]);

  if (!trackId || sparks.length === 0) return null;
  return <SparkOverlay trackId={trackId} sparks={sparks} />;
}
