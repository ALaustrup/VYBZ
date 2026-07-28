/**
 * App-root cam/voice call controller.
 * - Global presence gate (peer must be online)
 * - Personal ring channel so invites arrive without an open DM
 * - Owns the single WebRTC session + expanded/minimized layout
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/store/session";
import { useLiveSession, type LiveSession, type LiveSource } from "@/lib/liveSession";
import { isPeerOnline, useGlobalPresence } from "@/lib/presence";

export type CamLayout = "expanded" | "minimized";

interface RingInvite {
  threadId: string;
  fromId: string;
  fromName: string;
  source: LiveSource;
}

interface CamCallApi {
  session: LiveSession;
  threadId: string | null;
  peerId: string | null;
  peerName: string;
  layout: CamLayout;
  volume: number;
  setVolume: (v: number) => void;
  setLayout: (l: CamLayout) => void;
  /** True while waiting for peer to accept the ring (caller). */
  ringingOut: boolean;
  incomingInvite: RingInvite | null;
  startLiveCall: (opts: {
    threadId: string;
    peerId: string;
    peerName: string;
    source: LiveSource;
  }) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => void;
  /** Offline cam divert — open VideoMessageSheet. */
  videoMessage: { threadId: string; peerId: string; peerName: string } | null;
  clearVideoMessage: () => void;
}

type RingPayload = {
  kind: "invite" | "invite-accepted" | "invite-declined";
  threadId: string;
  fromId: string;
  fromName: string;
  source: LiveSource;
};

const Ctx = createContext<CamCallApi | null>(null);

function ringChannelName(userId: string) {
  return `user-ring:${userId}`;
}

async function publishRing(toUserId: string, payload: RingPayload) {
  if (!supabase) return;
  const ch = supabase.channel(ringChannelName(toUserId), { config: { broadcast: { self: false } } });
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await ch.send({ type: "broadcast", event: "ring", payload });
  // Brief linger so the packet can flush, then drop the ephemeral pub channel.
  setTimeout(() => { void supabase?.removeChannel(ch); }, 800);
}

export function CamCallProvider({ children }: { children: ReactNode }) {
  const { userId, profile, showToast } = useSession();
  useGlobalPresence(userId ? { id: userId, username: profile?.username ?? null } : null);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("them");
  const [layout, setLayout] = useState<CamLayout>("expanded");
  const [volume, setVolume] = useState(0.88);
  const [ringingOut, setRingingOut] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<RingInvite | null>(null);
  const [videoMessage, setVideoMessage] = useState<{
    threadId: string; peerId: string; peerName: string;
  } | null>(null);

  const session = useLiveSession(threadId, userId);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const pendingSourceRef = useRef<LiveSource | null>(null);
  const outgoingPeerRef = useRef<string | null>(null);

  // Clear ringing-out when media advances.
  useEffect(() => {
    if (session.state === "calling" || session.state === "connecting" || session.state === "connected" || session.state === "prep") {
      setRingingOut(false);
    }
    if (session.state === "idle" || session.state === "ended") {
      if (!incomingInvite && !ringingOut) {
        // Keep thread mounted briefly after end so UI can show "ended".
      }
    }
    if (session.state === "idle" && !ringingOut && !incomingInvite) {
      // Fully idle — release thread after hangup settled.
    }
  }, [session.state, incomingInvite, ringingOut]);

  useEffect(() => {
    if (session.state === "ended") {
      const t = setTimeout(() => {
        setThreadId(null);
        setPeerId(null);
        setRingingOut(false);
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [session.state]);

  // Personal ring inbox
  useEffect(() => {
    if (!userId || !supabase) return;
    const ch = supabase.channel(ringChannelName(userId), { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "ring" }, ({ payload }: { payload: RingPayload }) => {
      if (!payload || payload.fromId === userId) return;
      if (payload.kind === "invite") {
        // Ignore if already in a call
        const st = sessionRef.current.state;
        if (st !== "idle" && st !== "ended") return;
        setIncomingInvite({
          threadId: payload.threadId,
          fromId: payload.fromId,
          fromName: payload.fromName || "Someone",
          source: payload.source ?? "cam",
        });
        setPeerId(payload.fromId);
        setPeerName(payload.fromName || "Someone");
        setThreadId(payload.threadId);
        pendingSourceRef.current = payload.source ?? "cam";
        setLayout("expanded");
        return;
      }
      if (payload.kind === "invite-accepted") {
        if (outgoingPeerRef.current !== payload.fromId) return;
        const src = pendingSourceRef.current ?? payload.source ?? "cam";
        setRingingOut(false);
        void sessionRef.current.startCall(src);
        return;
      }
      if (payload.kind === "invite-declined") {
        if (outgoingPeerRef.current !== payload.fromId) return;
        setRingingOut(false);
        setThreadId(null);
        setPeerId(null);
        outgoingPeerRef.current = null;
        showToast(`${payload.fromName || "They"} declined the call`);
      }
    });
    ch.subscribe();
    return () => {
      void supabase?.removeChannel(ch);
    };
  }, [userId, showToast]);

  const startLiveCall = useCallback(async (opts: {
    threadId: string;
    peerId: string;
    peerName: string;
    source: LiveSource;
  }) => {
    if (!userId) return;
    if (opts.source === "cam" || opts.source === "mic") {
      if (!isPeerOnline(opts.peerId)) {
        if (opts.source === "cam") {
          setVideoMessage({
            threadId: opts.threadId,
            peerId: opts.peerId,
            peerName: opts.peerName,
          });
          showToast(`@${opts.peerName} is offline — leave a video message for when they return`);
          return;
        }
        showToast(
          `@${opts.peerName} is offline — they need to be on VYBZ for voice.`,
        );
        return;
      }
    }
    const st = sessionRef.current.state;
    if (st !== "idle" && st !== "ended") {
      showToast("You're already on a call");
      return;
    }
    setPeerId(opts.peerId);
    setPeerName(opts.peerName);
    setThreadId(opts.threadId);
    pendingSourceRef.current = opts.source;
    setLayout("expanded");
    setRingingOut(true);
    outgoingPeerRef.current = opts.peerId;
    await publishRing(opts.peerId, {
      kind: "invite",
      threadId: opts.threadId,
      fromId: userId,
      fromName: profile?.username || "Someone",
      source: opts.source,
    });
  }, [userId, profile?.username, showToast]);

  const acceptIncoming = useCallback(async () => {
    const inv = incomingInvite;
    if (!inv || !userId) return;
    setIncomingInvite(null);
    setThreadId(inv.threadId);
    setPeerId(inv.fromId);
    setPeerName(inv.fromName);
    pendingSourceRef.current = inv.source;
    setLayout("expanded");
    await publishRing(inv.fromId, {
      kind: "invite-accepted",
      threadId: inv.threadId,
      fromId: userId,
      fromName: profile?.username || "Someone",
      source: inv.source,
    });
    await new Promise((r) => setTimeout(r, 150));
    sessionRef.current.armIncoming(inv.source);
    await sessionRef.current.acceptCall();
  }, [incomingInvite, userId, profile?.username]);

  const declineIncoming = useCallback(() => {
    const inv = incomingInvite;
    setIncomingInvite(null);
    if (inv && userId) {
      void publishRing(inv.fromId, {
        kind: "invite-declined",
        threadId: inv.threadId,
        fromId: userId,
        fromName: profile?.username || "Someone",
        source: inv.source,
      });
    }
    sessionRef.current.declineCall();
    setThreadId(null);
    setPeerId(null);
  }, [incomingInvite, userId, profile?.username]);

  const clearVideoMessage = useCallback(() => setVideoMessage(null), []);

  const value = useMemo<CamCallApi>(() => ({
    session,
    threadId,
    peerId,
    peerName,
    layout,
    volume,
    setVolume,
    setLayout,
    ringingOut,
    incomingInvite,
    startLiveCall,
    acceptIncoming,
    declineIncoming,
    videoMessage,
    clearVideoMessage,
  }), [
    session, threadId, peerId, peerName, layout, volume, ringingOut, incomingInvite,
    startLiveCall, acceptIncoming, declineIncoming, videoMessage, clearVideoMessage,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCamCall() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCamCall requires CamCallProvider");
  return ctx;
}
