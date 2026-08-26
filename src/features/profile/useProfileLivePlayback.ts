import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { joinLiveSessionSfu, type LiveSfuSession } from "@/lib/livekitSfu";
import { takeLivePreviewHandoff } from "@/lib/livePreviewHandoff";
import type { LiveSessionDetail } from "@/types";

export type ProfileLiveStreamKind = "video" | "audio" | "connecting" | "ended";

/**
 * Single playback graph for Live embedded in a Profile banner.
 * Mirrors LiveWatchPage SFU + HLS fallback without chat, tips, or host tooling.
 */
export function useProfileLivePlayback(opts: {
  sessionId: string;
  isHost: boolean;
  enabled: boolean;
}) {
  const { sessionId, isHost, enabled } = opts;
  const [session, setSession] = useState<LiveSessionDetail | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [sfuActive, setSfuActive] = useState(false);
  const [vizStream, setVizStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sfuRef = useRef<LiveSfuSession | null>(null);
  const bumpedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setLoading(false);
      return;
    }
    bumpedRef.current = false;
    let alive = true;
    (async () => {
      const s = await api.getLiveSession(sessionId);
      if (!alive) return;
      setSession(s);
      setLoading(false);
      if (s?.status === "live") {
        void api.bumpLiveViewers(sessionId, 1);
        bumpedRef.current = true;
      }
    })();
    return () => {
      alive = false;
      if (bumpedRef.current) void api.bumpLiveViewers(sessionId, -1);
    };
  }, [sessionId, enabled]);

  useEffect(() => {
    if (!enabled || !session || session.status !== "live" || !sessionId) return;
    const preferSfu = session.sfuProvider === "livekit" || !!session.livekitRoom;
    if (!preferSfu) return;

    let cancelled = false;
    const handoff = isHost ? takeLivePreviewHandoff() : null;
    // Profile embed subscribes by default. Publish only when a GoLive handoff exists.
    const canPublish = isHost && !!handoff;

    (async () => {
      const sfu = await joinLiveSessionSfu({
        sessionId,
        canPublish,
        audioMode: session.audioMode ?? "music",
        localStream: handoff,
        hostSource: session.source,
        videoEl: videoRef.current,
        releaseLocalOnDisconnect: session.source !== "daw",
        onAnalyserStream: (stream) => {
          if (!cancelled) setVizStream(stream);
        },
      });
      if (cancelled) {
        await sfu.disconnect();
        handoff?.getTracks().forEach((t) => t.stop());
        return;
      }
      sfuRef.current = sfu;
      setSfuActive(sfu.connected);
      if (!sfu.connected && isHost && handoff && videoRef.current) {
        videoRef.current.srcObject = handoff;
        videoRef.current.muted = true;
        void videoRef.current.play().catch(() => {});
        setSfuActive(true);
        setVizStream(handoff);
      } else if (!sfu.connected) {
        handoff?.getTracks().forEach((t) => t.stop());
      }
    })();

    return () => {
      cancelled = true;
      void sfuRef.current?.disconnect();
      sfuRef.current = null;
      setSfuActive(false);
      setVizStream(null);
    };
  }, [
    enabled,
    session?.id,
    session?.status,
    session?.sfuProvider,
    session?.livekitRoom,
    session?.audioMode,
    session?.source,
    isHost,
    sessionId,
  ]);

  useEffect(() => {
    const el = videoRef.current;
    if (!enabled || !el || !session?.playbackHls || sfuActive) return;
    el.src = session.playbackHls;
    void el.play().catch(() => {});
    const tryCapture = () => {
      try {
        const cap = (el as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        if (cap?.getAudioTracks().length) setVizStream(cap);
      } catch {
        /* ignore */
      }
    };
    el.addEventListener("playing", tryCapture);
    return () => el.removeEventListener("playing", tryCapture);
  }, [enabled, session?.playbackHls, sfuActive]);

  const ended = !session || session.status !== "live";
  const hasVideoTrack = !!vizStream?.getVideoTracks().some((t) => t.readyState === "live");
  const hasHls = !!session?.playbackHls && !sfuActive;
  const hasVideo = hasVideoTrack || hasHls;
  const audioOnly =
    !ended && !hasVideo && !!vizStream?.getAudioTracks().some((t) => t.readyState === "live");
  const playing = sfuActive || !!session?.playbackHls;

  const streamKind: ProfileLiveStreamKind = ended
    ? "ended"
    : audioOnly
      ? "audio"
      : hasVideo
        ? "video"
        : "connecting";

  return {
    session,
    loading,
    videoRef,
    vizStream,
    sfuActive,
    hasVideo,
    audioOnly,
    playing,
    ended,
    streamKind,
  };
}
