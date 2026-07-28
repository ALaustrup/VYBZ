/**
 * App-wide online presence — gates cam-to-cam (peer must be online).
 * Supabase Realtime Presence on a single channel; no location leak.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL = "vybz-online";

type PresenceMeta = { user_id: string; username: string | null };

let channel: RealtimeChannel | null = null;
let onlineIds = new Set<string>();
const listeners = new Set<() => void>();
let trackedUserId: string | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function rebuildFromChannel(ch: RealtimeChannel) {
  const state = ch.presenceState() as Record<string, PresenceMeta[]>;
  const next = new Set<string>();
  for (const rows of Object.values(state)) {
    for (const p of rows) {
      if (p?.user_id) next.add(p.user_id);
    }
  }
  onlineIds = next;
  emit();
}

/** Keep this user marked online while the app shell is mounted. */
export function joinGlobalPresence(me: { id: string; username: string | null }): () => void {
  if (!supabase) return () => undefined;
  if (channel && trackedUserId === me.id) return () => undefined;

  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }

  trackedUserId = me.id;
  const ch = supabase.channel(CHANNEL, { config: { presence: { key: me.id } } });
  ch.on("presence", { event: "sync" }, () => rebuildFromChannel(ch));
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      void ch.track({ user_id: me.id, username: me.username });
    }
  });
  channel = ch;

  return () => {
    if (channel === ch) {
      void supabase?.removeChannel(ch);
      channel = null;
      trackedUserId = null;
      onlineIds = new Set();
      emit();
    }
  };
}

export function isPeerOnline(peerId: string): boolean {
  return onlineIds.has(peerId);
}

export function getOnlineIds(): Set<string> {
  return onlineIds;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function usePeerOnline(peerId: string | null | undefined): boolean {
  const snap = useSyncExternalStore(
    subscribe,
    () => onlineIds,
    () => onlineIds,
  );
  if (!peerId) return false;
  return snap.has(peerId);
}

/** Mount once in the authenticated shell. */
export function useGlobalPresence(me: { id: string; username: string | null } | null) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!me?.id) return;
    const unsubListen = subscribe(() => setTick((t) => t + 1));
    const leave = joinGlobalPresence(me);
    return () => {
      unsubListen();
      leave();
    };
  }, [me?.id, me?.username]);
}
