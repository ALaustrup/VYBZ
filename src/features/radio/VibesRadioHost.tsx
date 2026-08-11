import { useEffect, useRef } from "react";
import {
  joinVibesRadio,
  type VibesRadioAudience,
} from "@/features/radio/vibesRadio";
import { getSnapshot } from "@/lib/audioBus";

const POLL_MS = 10_000;
const RADIO_PREFIX = "vibes-radio:";

/**
 * Keeps the client joined to the global Vibes Radio clock.
 * Does not steal playback if the user already started a non-radio track (suite only).
 */
export function VibesRadioHost({
  audience,
  enabled = true,
  yieldToUser = false,
}: {
  audience: VibesRadioAudience;
  enabled?: boolean;
  /** When true, skip joining if a non-radio track is already loaded. */
  yieldToUser?: boolean;
}) {
  const audienceRef = useRef(audience);
  audienceRef.current = audience;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer = 0;

    const tick = async () => {
      if (cancelled) return;
      if (yieldToUser) {
        const t = getSnapshot().track;
        if (t && !t.id.startsWith(RADIO_PREFIX)) return;
      }
      await joinVibesRadio(audienceRef.current);
    };

    void tick();
    timer = window.setInterval(() => void tick(), POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, yieldToUser, audience]);

  return null;
}
