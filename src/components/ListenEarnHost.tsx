import { useEffect, useRef } from "react";
import { usePlayer } from "@/lib/audioBus";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";

const awarded = new Set<string>();

/**
 * Meaningful listen → Vc. Fires once per drop per session when the listener
 * reaches ≥30s or ≥50% of duration on another user's earn-eligible drop.
 */
export function ListenEarnHost() {
  const player = usePlayer();
  const { userId, showToast } = useSession();
  const toasted = useRef(new Set<string>());

  useEffect(() => {
    const t = player.track;
    if (!userId || !t?.earnEligible || !t.id) return;
    if (t.authorId && t.authorId === userId) return;
    if (!player.playing) return;

    const dur = player.duration || t.durationSec || 0;
    const need = dur > 0 ? Math.min(30, Math.max(15, dur * 0.5)) : 30;
    if (player.currentTime < need) return;

    const key = `${userId}:${t.id}`;
    if (awarded.has(key)) return;
    awarded.add(key);

    void api.recordPlay(t.id);
    void api.awardSocialVc("listen_together", "drop", t.id).then((amt) => {
      if (amt > 0 && !toasted.current.has(key)) {
        toasted.current.add(key);
        showToast(`+${amt.toFixed(2)} Vc · listen`);
      }
    });
  }, [
    userId,
    player.track?.id,
    player.track?.authorId,
    player.track?.earnEligible,
    player.currentTime,
    player.duration,
    player.playing,
    showToast,
  ]);

  return null;
}
