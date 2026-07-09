// ---------------------------------------------------------------------------
// Live 1:1 audio sessions between two DM participants (Phase H1).
//
// Pure peer-to-peer WebRTC — NO media server. The host captures their microphone
// or desktop/tab audio and streams it to the other user, who hears it in the chat
// window (and can record it / later extract MIDI). Signaling (offer / answer /
// ICE / bye) rides the Supabase Realtime broadcast channel we already use, and NAT
// traversal uses free public STUN. One-way by design (host → listener), matching
// the production-collaboration flow; trivially extensible to two-way later.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type LiveState = "idle" | "calling" | "incoming" | "connecting" | "connected" | "ended";
export type LiveSource = "mic" | "desktop";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface Signal { from: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; source?: LiveSource }

export interface LiveSession {
  state: LiveState;
  isHost: boolean;
  source: LiveSource | null;
  /** The audio stream to surface: local for the host, remote for the listener. */
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
  incoming: boolean;
  error: string | null;
  muted: boolean;
  startCall: (source: LiveSource) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

async function capture(source: LiveSource): Promise<MediaStream> {
  if (source === "desktop") {
    // Tab/system audio (desktop Chrome/Edge). video:true is required to expose an
    // audio track in most browsers; we drop the video track and keep audio only.
    const s = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    s.getVideoTracks().forEach((t) => { t.stop(); s.removeTrack(t); });
    if (s.getAudioTracks().length === 0) throw new Error("No audio was shared. In the picker, choose a tab/screen and tick “Share audio”.");
    return s;
  }
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false }, video: false });
}

export function useLiveSession(threadId: string, selfId: string | null): LiveSession {
  const [state, setState] = useState<LiveState>("idle");
  const [isHost, setIsHost] = useState(false);
  const [source, setSource] = useState<LiveSource | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const chRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const send = useCallback((event: string, payload: Omit<Signal, "from">) => {
    chRef.current?.send({ type: "broadcast", event, payload: { ...payload, from: selfId } });
  }, [selfId]);

  const cleanup = useCallback((next: LiveState = "idle") => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingOfferRef.current = null;
    setStream(null);
    setRemoteStream(null);
    setIsHost(false);
    setSource(null);
    setMuted(false);
    setState(next);
    if (next === "ended") setTimeout(() => setState((s) => (s === "ended" ? "idle" : s)), 1500);
  }, []);

  const buildPc = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => { if (e.candidate) send("ice", { candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") setState("connected");
      else if (st === "failed" || st === "disconnected" || st === "closed") cleanup("ended");
    };
    pcRef.current = pc;
    return pc;
  }, [send, cleanup]);

  // Subscribe to the per-thread signaling channel.
  useEffect(() => {
    if (!threadId || !selfId) return;
    const ch = supabase!.channel(`dm-rtc:${threadId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "offer" }, ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId || pcRef.current) return;
      pendingOfferRef.current = payload.sdp ?? null;
      setSource(payload.source ?? "mic");
      setIsHost(false);
      setState("incoming");
    });
    ch.on("broadcast", { event: "answer" }, async ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId || !pcRef.current || !payload.sdp) return;
      try { await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp)); setState("connecting"); } catch { /* ignore */ }
    });
    ch.on("broadcast", { event: "ice" }, async ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId || !pcRef.current || !payload.candidate) return;
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { /* ignore */ }
    });
    ch.on("broadcast", { event: "bye" }, ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId) return;
      cleanup("ended");
    });
    ch.subscribe();
    chRef.current = ch;
    return () => { supabase?.removeChannel(ch); chRef.current = null; cleanup("idle"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, selfId]);

  const startCall = useCallback(async (src: LiveSource) => {
    setError(null);
    try {
      const local = await capture(src);
      localRef.current = local;
      setStream(local);
      setIsHost(true);
      setSource(src);
      const pc = buildPc();
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      const offer = await pc.createOffer({ offerToReceiveAudio: false });
      await pc.setLocalDescription(offer);
      send("offer", { sdp: offer, source: src });
      setState("calling");
    } catch (e) {
      setError(mediaError(e));
      cleanup("idle");
    }
  }, [buildPc, send, cleanup]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer) return;
    try {
      const pc = buildPc();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send("answer", { sdp: answer });
      setState("connecting");
    } catch (e) {
      setError(mediaError(e));
      cleanup("idle");
    }
  }, [buildPc, send, cleanup]);

  const declineCall = useCallback(() => { send("bye", {}); cleanup("idle"); }, [send, cleanup]);
  const endCall = useCallback(() => { send("bye", {}); cleanup("ended"); }, [send, cleanup]);
  const toggleMute = useCallback(() => {
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  }, []);

  return {
    state, isHost, source,
    stream: isHost ? stream : remoteStream,
    remoteStream, incoming: state === "incoming", error, muted,
    startCall, acceptCall, declineCall, endCall, toggleMute,
  };
}

function mediaError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") return "Permission denied. Allow microphone / screen-audio access and try again.";
  if (name === "NotFoundError") return "No audio input found on this device.";
  return (e as { message?: string })?.message || "Couldn't start the live session.";
}
