/**
 * Companion transport. Default implementation uses Supabase realtime broadcast.
 * Tests inject a memory transport — no native SDK imports.
 */

import { supabase } from "@/lib/supabase";
import {
  applyCompanionMessage,
  companionTopic,
  parseCompanionMessage,
  type CompanionMessage,
  type CompanionRole,
  type CompanionState,
  INITIAL_COMPANION_STATE,
} from "./companionProtocol";

export type CompanionTransport = {
  send: (msg: CompanionMessage) => Promise<void>;
  subscribe: (onMessage: (msg: CompanionMessage) => void) => () => void;
};

export type CompanionHandle = {
  state: () => CompanionState;
  send: (msg: CompanionMessage) => Promise<void>;
  subscribe: (onChange: (state: CompanionState, msg: CompanionMessage) => void) => () => void;
  close: () => void;
};

export function createMemoryTransport(): CompanionTransport & { inbox: CompanionMessage[] } {
  const inbox: CompanionMessage[] = [];
  const subs = new Set<(msg: CompanionMessage) => void>();
  return {
    inbox,
    async send(msg) {
      inbox.push(msg);
      subs.forEach((fn) => fn(msg));
    },
    subscribe(onMessage) {
      subs.add(onMessage);
      return () => {
        subs.delete(onMessage);
      };
    },
  };
}

export function createSupabaseCompanionTransport(sessionId: string): CompanionTransport | null {
  if (!supabase) return null;
  const ch = supabase.channel(companionTopic(sessionId), {
    config: { broadcast: { self: false } },
  });
  void ch.subscribe();
  return {
    async send(msg) {
      await ch.send({ type: "broadcast", event: "control", payload: msg });
    },
    subscribe(onMessage) {
      ch.on("broadcast", { event: "control" }, ({ payload }) => {
        const msg = parseCompanionMessage(payload);
        if (msg) onMessage(msg);
      });
      return () => {
        void supabase?.removeChannel(ch);
      };
    },
  };
}

export function openCompanionChannel(opts: {
  sessionId: string;
  role: CompanionRole;
  deviceLabel: string;
  transport?: CompanionTransport;
}): CompanionHandle | null {
  const transport = opts.transport ?? createSupabaseCompanionTransport(opts.sessionId);
  if (!transport) return null;

  let state: CompanionState = { ...INITIAL_COMPANION_STATE };
  const watchers = new Set<(state: CompanionState, msg: CompanionMessage) => void>();

  const unsub = transport.subscribe((msg) => {
    state = applyCompanionMessage(state, msg);
    watchers.forEach((fn) => fn(state, msg));
  });

  void transport.send({ type: "hello", role: opts.role, deviceLabel: opts.deviceLabel });

  return {
    state: () => state,
    send: (msg) => transport.send(msg),
    subscribe(onChange) {
      watchers.add(onChange);
      return () => {
        watchers.delete(onChange);
      };
    },
    close() {
      unsub();
      watchers.clear();
    },
  };
}
