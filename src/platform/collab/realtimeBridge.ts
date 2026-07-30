/**
 * Optional Supabase Realtime bridge for release collab channels.
 * Presence + broadcast cursors. Falls back silently when supabase unavailable.
 */

import type { CollabCursor, CollabPane } from "@vybz/domain/collab";
import {
  joinCollabPresence,
  leaveCollabPresence,
  publishCollabCursor,
} from "./sessionStore";

type ChannelLike = {
  unsubscribe?: () => void;
};

const channels = new Map<string, ChannelLike>();

export async function bindReleaseCollabRealtime(opts: {
  releaseId: string;
  userId: string;
  username: string | null;
  pane: CollabPane;
}): Promise<() => void> {
  joinCollabPresence(opts);

  try {
    const { supabase } = await import("@/lib/supabase");
    if (!supabase) {
      return () => leaveCollabPresence(opts.releaseId, opts.userId);
    }

    const topic = `release-collab:${opts.releaseId}`;
    if (channels.has(topic)) {
      return () => leaveCollabPresence(opts.releaseId, opts.userId);
    }

    const ch = supabase.channel(topic, {
      config: { presence: { key: opts.userId } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<
        string,
        Array<{ user_id?: string; username?: string | null; pane?: CollabPane }>
      >;
      for (const rows of Object.values(state)) {
        for (const p of rows) {
          if (!p?.user_id) continue;
          joinCollabPresence({
            releaseId: opts.releaseId,
            userId: p.user_id,
            username: p.username ?? null,
            pane: p.pane ?? "prepare",
          });
        }
      }
    });

    ch.on("broadcast", { event: "cursor" }, ({ payload }) => {
      const c = payload as Partial<CollabCursor> & { userId?: string };
      if (!c.userId || c.userId === opts.userId) return;
      publishCollabCursor({
        releaseId: opts.releaseId,
        userId: c.userId,
        username: c.username ?? null,
        pane: (c.pane as CollabPane) ?? "prepare",
        x: Number(c.x) || 0,
        y: Number(c.y) || 0,
        focusField: c.focusField ?? null,
      });
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.track({
          user_id: opts.userId,
          username: opts.username,
          pane: opts.pane,
        });
      }
    });

    channels.set(topic, ch);

    return () => {
      leaveCollabPresence(opts.releaseId, opts.userId);
      void supabase.removeChannel(ch);
      channels.delete(topic);
    };
  } catch {
    return () => leaveCollabPresence(opts.releaseId, opts.userId);
  }
}

export async function broadcastCursor(opts: {
  releaseId: string;
  userId: string;
  username: string | null;
  pane: CollabPane;
  x: number;
  y: number;
  focusField?: string | null;
}): Promise<void> {
  publishCollabCursor(opts);
  try {
    const { supabase } = await import("@/lib/supabase");
    const topic = `release-collab:${opts.releaseId}`;
    const ch = channels.get(topic) as
      | { send?: (args: unknown) => Promise<unknown> }
      | undefined;
    if (!supabase || !ch?.send) return;
    await ch.send({
      type: "broadcast",
      event: "cursor",
      payload: {
        userId: opts.userId,
        username: opts.username,
        pane: opts.pane,
        x: opts.x,
        y: opts.y,
        focusField: opts.focusField ?? null,
      },
    });
  } catch {
    /* ignore */
  }
}
