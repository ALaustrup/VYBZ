// ---------------------------------------------------------------------------
// Live 1:1 voice/cam sessions between two DM participants.
// Pure peer-to-peer WebRTC. ICE from edge `ice-servers` (STUN + optional TURN).
// Cam calls support a post-accept "prep" stage (self-view) before answering.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as api from "@/lib/api";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type LiveState =
  | "idle"
  | "calling"
  | "incoming"
  | "prep"
  | "connecting"
  | "connected"
  | "ended";

export type LiveSource = "mic" | "desktop" | "cam";

/** Prep window before callee answers a cam invite (ms). */
export const CAM_PREP_MS = 10_000;
/** Show numeric countdown when remaining ≤ this many seconds. */
export const CAM_COUNTDOWN_FROM = 5;

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface Signal {
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  source?: LiveSource;
}

export interface LiveSession {
  state: LiveState;
  isHost: boolean;
  source: LiveSource | null;
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
  incoming: boolean;
  error: string | null;
  muted: boolean;
  camEnabled: boolean;
  turnHint: string | null;
  /** Seconds remaining in prep (cam only); null when not in prep. */
  prepRemainingSec: number | null;
  startCall: (source: LiveSource) => Promise<void>;
  /** Begin local capture / prep (cam) or answer immediately (mic/desktop). */
  acceptCall: () => Promise<void>;
  /** Skip remaining prep and connect now. */
  finishPrep: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCam: () => void;
  flipCamera: () => Promise<void>;
  /** Show incoming UI before WebRTC offer (ring channel). */
  armIncoming: (source: LiveSource) => void;
}

async function capture(source: LiveSource, facing: "user" | "environment" = "user"): Promise<MediaStream> {
  if (source === "desktop") {
    const s = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    s.getVideoTracks().forEach((t) => { t.stop(); s.removeTrack(t); });
    if (s.getAudioTracks().length === 0) {
      throw new Error("No audio was shared. In the picker, choose a tab/screen and tick “Share audio”.");
    }
    return s;
  }
  if (source === "cam") {
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
}

export function useLiveSession(threadId: string | null, selfId: string | null): LiveSession {
  const [state, setState] = useState<LiveState>("idle");
  const [isHost, setIsHost] = useState(false);
  const [source, setSource] = useState<LiveSource | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camEnabled, setCamEnabled] = useState(true);
  const [turnHint, setTurnHint] = useState<string | null>(null);
  const [prepRemainingSec, setPrepRemainingSec] = useState<number | null>(null);

  const chRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingSourceRef = useRef<LiveSource>("mic");
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const iceRef = useRef<RTCIceServer[]>(FALLBACK_ICE);
  const iceRestartedRef = useRef(false);
  const endingRef = useRef(false);
  const facingRef = useRef<"user" | "environment">("user");
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeringRef = useRef(false);
  const autoAnswerRef = useRef(false);
  const prepDoneRef = useRef(false);
  const acceptCallRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    void api.fetchIceServers().then((s) => { iceRef.current = s; }).catch(() => { /* STUN fallback */ });
    void api.fetchIceStatus().then((st) => {
      if (st && !st.turnConfigured) {
        setTurnHint("Voice/cam works best on the same network until TURN is fully ready.");
      }
    }).catch(() => { /* ignore */ });
  }, []);

  const clearPrepTimer = useCallback(() => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    setPrepRemainingSec(null);
  }, []);

  const send = useCallback((event: string, payload: Omit<Signal, "from">) => {
    chRef.current?.send({ type: "broadcast", event, payload: { ...payload, from: selfId } });
  }, [selfId]);

  const cleanup = useCallback((next: LiveState = "idle") => {
    endingRef.current = true;
    answeringRef.current = false;
    autoAnswerRef.current = false;
    prepDoneRef.current = false;
    clearPrepTimer();
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    iceRestartedRef.current = false;
    facingRef.current = "user";
    setStream(null);
    setRemoteStream(null);
    setIsHost(false);
    setSource(null);
    setMuted(false);
    setCamEnabled(true);
    setState(next);
    if (next === "ended") setTimeout(() => setState((s) => (s === "ended" ? "idle" : s)), 1800);
    endingRef.current = false;
  }, [clearPrepTimer]);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.splice(0);
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore stale */ }
    }
  }, []);

  const buildPc = useCallback(async () => {
    try { iceRef.current = await api.fetchIceServers(); } catch { /* keep cached */ }
    const pc = new RTCPeerConnection({ iceServers: iceRef.current });
    pc.onicecandidate = (e) => { if (e.candidate) send("ice", { candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    pc.onconnectionstatechange = () => {
      if (endingRef.current || pcRef.current !== pc) return;
      const st = pc.connectionState;
      if (st === "connected") {
        iceRestartedRef.current = false;
        setState("connected");
        setError(null);
        return;
      }
      if (st === "failed" || st === "disconnected") {
        if (!iceRestartedRef.current && st === "failed") {
          iceRestartedRef.current = true;
          setError("Connection unstable — retrying…");
          try {
            void pc.restartIce();
            return;
          } catch { /* fall through */ }
        }
        setError(st === "failed"
          ? "Couldn't connect. Check mic/camera permissions and try again."
          : "Connection dropped.");
        cleanup("ended");
        return;
      }
      if (st === "closed") cleanup("ended");
    };
    pcRef.current = pc;
    return pc;
  }, [send, cleanup]);

  const answerWithLocalRef = useRef<() => Promise<void>>(async () => undefined);

  const answerWithLocal = useCallback(async () => {
    if (answeringRef.current) return;
    const offer = pendingOfferRef.current;
    const local = localRef.current;
    if (!offer || !local) return;
    answeringRef.current = true;
    clearPrepTimer();
    const src = pendingSourceRef.current;
    try {
      setSource(src);
      setIsHost(false);
      const pc = await buildPc();
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send("answer", { sdp: answer });
      setState("connecting");
    } catch (e) {
      setError(mediaError(e, src));
      cleanup("idle");
    } finally {
      answeringRef.current = false;
    }
  }, [buildPc, send, cleanup, flushIce, clearPrepTimer]);
  answerWithLocalRef.current = answerWithLocal;

  const startPrepCountdown = useCallback(() => {
    clearPrepTimer();
    prepDoneRef.current = false;
    const started = Date.now();
    setPrepRemainingSec(Math.ceil(CAM_PREP_MS / 1000));
    prepTimerRef.current = setInterval(() => {
      const left = Math.max(0, CAM_PREP_MS - (Date.now() - started));
      const sec = Math.ceil(left / 1000);
      setPrepRemainingSec(sec);
      if (left <= 0) {
        prepDoneRef.current = true;
        clearPrepTimer();
        void answerWithLocalRef.current();
      }
    }, 200);
  }, [clearPrepTimer]);

  useEffect(() => {
    if (!threadId || !selfId || !supabase) {
      return;
    }
    const ch = supabase.channel(`dm-rtc:${threadId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "offer" }, ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId || pcRef.current) return;
      pendingOfferRef.current = payload.sdp ?? null;
      pendingSourceRef.current = payload.source ?? "mic";
      setSource(payload.source ?? "mic");
      setIsHost(false);
      setState((s) => {
        if (s === "prep") {
          if (prepDoneRef.current || autoAnswerRef.current) {
            autoAnswerRef.current = false;
            queueMicrotask(() => { void answerWithLocalRef.current(); });
          }
          return "prep";
        }
        if (autoAnswerRef.current) {
          autoAnswerRef.current = false;
          queueMicrotask(() => { void acceptCallRef.current(); });
          return s === "idle" || s === "ended" ? "incoming" : s;
        }
        return "incoming";
      });
    });
    ch.on("broadcast", { event: "answer" }, async ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId || !pcRef.current || !payload.sdp) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushIce(pcRef.current);
        setState("connecting");
      } catch { /* ignore */ }
    });
    ch.on("broadcast", { event: "ice" }, async ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId || !payload.candidate) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(payload.candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { /* ignore */ }
    });
    ch.on("broadcast", { event: "bye" }, ({ payload }: { payload: Signal }) => {
      if (payload.from === selfId) return;
      cleanup("ended");
    });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      void supabase?.removeChannel(ch);
      chRef.current = null;
      cleanup("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, selfId]);

  const startCall = useCallback(async (src: LiveSource) => {
    setError(null);
    iceRestartedRef.current = false;
    try {
      const local = await capture(src);
      localRef.current = local;
      setStream(local);
      setIsHost(true);
      setSource(src);
      setCamEnabled(true);
      const pc = await buildPc();
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send("offer", { sdp: offer, source: src });
      setState("calling");
    } catch (e) {
      setError(mediaError(e, src));
      cleanup("idle");
    }
  }, [buildPc, send, cleanup]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    const src = pendingSourceRef.current;
    if (!offer) {
      setError(null);
      if (src === "cam") {
        try {
          const local = await capture("cam");
          localRef.current = local;
          setStream(local);
          setSource("cam");
          setIsHost(false);
          setCamEnabled(true);
          setState("prep");
          startPrepCountdown();
        } catch (e) {
          setError(mediaError(e, "cam"));
          cleanup("idle");
        }
        return;
      }
      // Mic/desktop: wait for SDP, then auto-answer.
      autoAnswerRef.current = true;
      setState("connecting");
      return;
    }
    setError(null);
    iceRestartedRef.current = false;
    try {
      const local = await capture(src);
      localRef.current = local;
      setStream(local);
      setSource(src);
      setIsHost(false);
      setCamEnabled(true);
      if (src === "cam") {
        setState("prep");
        startPrepCountdown();
        return;
      }
      await answerWithLocal();
    } catch (e) {
      setError(mediaError(e, src));
      cleanup("idle");
    }
  }, [cleanup, startPrepCountdown, answerWithLocal]);

  acceptCallRef.current = acceptCall;

  // When offer arrives during prep with countdown finished, answer.
  useEffect(() => {
    if (state !== "prep") return;
    if (!pendingOfferRef.current || !localRef.current) return;
    if (prepRemainingSec === 0) void answerWithLocal();
  }, [state, prepRemainingSec, answerWithLocal]);

  // Cam prep: if offer arrives mid-prep, stay in prep (countdown handles answer).
  // Mic auto-answer is handled in the offer broadcast handler via acceptCallRef.

  const finishPrep = useCallback(async () => {
    if (state !== "prep") return;
    prepDoneRef.current = true;
    if (!pendingOfferRef.current) {
      autoAnswerRef.current = true;
      setPrepRemainingSec(0);
      return;
    }
    await answerWithLocal();
  }, [state, answerWithLocal]);

  const declineCall = useCallback(() => { send("bye", {}); cleanup("idle"); }, [send, cleanup]);
  const endCall = useCallback(() => { send("bye", {}); cleanup("ended"); }, [send, cleanup]);

  const toggleMute = useCallback(() => {
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  }, []);

  const toggleCam = useCallback(() => {
    const t = localRef.current?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamEnabled(t.enabled);
    }
  }, []);

  const flipCamera = useCallback(async () => {
    if (!localRef.current || source !== "cam") return;
    const nextFacing = facingRef.current === "user" ? "environment" : "user";
    try {
      const fresh = await capture("cam", nextFacing);
      const newVideo = fresh.getVideoTracks()[0];
      const oldVideo = localRef.current.getVideoTracks()[0];
      if (oldVideo) {
        localRef.current.removeTrack(oldVideo);
        oldVideo.stop();
      }
      if (newVideo) localRef.current.addTrack(newVideo);
      fresh.getAudioTracks().forEach((t) => t.stop());
      facingRef.current = nextFacing;
      setStream(new MediaStream(localRef.current.getTracks()));
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (sender && newVideo) await sender.replaceTrack(newVideo);
    } catch {
      setError("Couldn't flip camera on this device.");
    }
  }, [source]);

  /** Ring layer: show incoming before SDP offer lands. */
  const armIncoming = useCallback((src: LiveSource) => {
    pendingSourceRef.current = src;
    setSource(src);
    setIsHost(false);
    setState((s) => (s === "idle" || s === "ended" ? "incoming" : s));
  }, []);

  return {
    state, isHost, source, stream, remoteStream,
    incoming: state === "incoming", error, muted, camEnabled, turnHint, prepRemainingSec,
    startCall, acceptCall, finishPrep, declineCall, endCall, toggleMute, toggleCam, flipCamera,
    armIncoming,
  };
}

function mediaError(e: unknown, source?: LiveSource): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") {
    return source === "cam"
      ? "Permission denied. Allow camera and microphone, then try again."
      : "Permission denied. Allow microphone / screen-audio access and try again.";
  }
  if (name === "NotFoundError") {
    return source === "cam" ? "No camera or mic found on this device." : "No audio input found on this device.";
  }
  return (e as { message?: string })?.message || "Couldn't start the live session.";
}
