import { useEffect, useState } from "react";
import { supabase, BACKEND_ENABLED } from "@/lib/supabase";

/**
 * Global presence: how many souls are online right now, via a shared Supabase
 * Realtime presence channel. Returns 0 in local mode.
 */
export function usePresence(key: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!supabase || !BACKEND_ENABLED || !key) return;
    const channel = supabase.channel("presence:global", {
      config: { presence: { key } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: Date.now() });
        }
      });
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [key]);

  return count;
}
