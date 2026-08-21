/**
 * Unified Social Live — LiveKit SFU client helpers (Phase 2).
 * Degrades gracefully when LiveKit secrets / SDK are unavailable.
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "@/lib/supabase";
import type { VoiceSlotSnapshot } from "@/lib/voiceSlots";
import { EMPTY_VOICE_SLOTS, VoiceSlotManager } from "@/lib/voiceSlots";
import { livekitPublishSourceKind, type LivekitPublishKind } from "@/features/broadcast/liveSource";
import type { LiveSource } from "@/types";

export type LivekitTokenResponse = {
  configured: boolean;
  url?: string;
  token?: string;
  room?: string;
  role?: string;
  audioMode?: "music" | "speech";
  canPublish?: boolean;
  error?: string;
  hint?: string;
};

/** Producer-friendly publish constraints (hint only — LiveKit applies server-side). */
export const MUSIC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 2,
};

export const SPEECH_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

async function invokeLivekitToken(body: Record<string, unknown>): Promise<LivekitTokenResponse> {
  if (!supabase || !SUPABASE_URL) {
    return { configured: false, error: "supabase_unavailable" };
  }
  const sess = (await supabase.auth.getSession()).data.session;
  if (!sess) return { configured: false, error: "unauthorized" };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/livekit-token`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${sess.access_token}`,
      apikey: SUPABASE_ANON_KEY ?? "",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as LivekitTokenResponse;
  if (!res.ok) {
    return {
      configured: !!j.configured,
      error: j.error ?? `http_${res.status}`,
      hint: j.hint,
    };
  }
  return j;
}

export function mintLiveBroadcastToken(sessionId: string, canPublish = true) {
  return invokeLivekitToken({ purpose: "live", sessionId, canPublish });
}

export function mintRoomVoiceToken(roomId: string, canPublish = true) {
  return invokeLivekitToken({ purpose: "voice", roomId, canPublish });
}

function toLkPublishSource(
  lk: typeof import("livekit-client"),
  kind: LivekitPublishKind,
): import("livekit-client").Track.Source {
  if (kind === "screen_share") return lk.Track.Source.ScreenShare;
  if (kind === "screen_share_audio") return lk.Track.Source.ScreenShareAudio;
  if (kind === "microphone") return lk.Track.Source.Microphone;
  return lk.Track.Source.Camera;
}

/**
 * Dynamic import of livekit-client so the main bundle stays light until Go Live / voice.
 * Returns null if the package is not installed or LiveKit is unconfigured.
 */
export async function connectLivekitRoom(opts: {
  url: string;
  token: string;
  audioMode?: "music" | "speech";
}): Promise<{ room: import("livekit-client").Room; disconnect: () => Promise<void> } | null> {
  try {
    const lk = await import("livekit-client");
    const room = new lk.Room({
      adaptiveStream: true,
      dynacast: true,
      // Prefer quality for music mode
      videoCaptureDefaults: { resolution: lk.VideoPresets.h720.resolution },
    });
    await room.connect(opts.url, opts.token);
    return {
      room,
      disconnect: async () => {
        await room.disconnect(true);
      },
    };
  } catch {
    return null;
  }
}

export type LiveSfuSession = {
  configured: boolean;
  connected: boolean;
  disconnect: () => Promise<void>;
  error?: string;
};

/**
 * Join a live_sessions SFU as publisher (host) or subscriber (viewer).
 * Attaches remote/local video to `videoEl` when provided.
 */
export async function joinLiveSessionSfu(opts: {
  sessionId: string;
  canPublish: boolean;
  audioMode?: "music" | "speech";
  /** Host preview handoff; otherwise host will capture via LiveKit defaults. */
  localStream?: MediaStream | null;
  /** Public live_sessions.source — screen share vs camera vs audio-only. */
  hostSource?: LiveSource;
  videoEl?: HTMLVideoElement | null;
  /** MediaStream for LiveVisualizer (cloned audio/video tracks — do not stop). */
  onAnalyserStream?: (stream: MediaStream | null) => void;
  /** When false, caller owns localStream tracks (DAW AudioContext destination). */
  releaseLocalOnDisconnect?: boolean;
}): Promise<LiveSfuSession> {
  const tokenRes = await mintLiveBroadcastToken(opts.sessionId, opts.canPublish);
  if (!tokenRes.configured || !tokenRes.url || !tokenRes.token) {
    return {
      configured: false,
      connected: false,
      disconnect: async () => {},
      error: tokenRes.error ?? "livekit_unconfigured",
    };
  }

  const conn = await connectLivekitRoom({
    url: tokenRes.url,
    token: tokenRes.token,
    audioMode: opts.audioMode ?? tokenRes.audioMode,
  });
  if (!conn) {
    return {
      configured: true,
      connected: false,
      disconnect: async () => {},
      error: "connect_failed",
    };
  }

  const { room, disconnect: baseDisconnect } = conn;
  const localOwned: MediaStreamTrack[] = [];
  const vizTracks = new Map<string, MediaStreamTrack>();

  const publishViz = () => {
    if (!opts.onAnalyserStream) return;
    if (vizTracks.size === 0) {
      opts.onAnalyserStream(null);
      return;
    }
    opts.onAnalyserStream(new MediaStream([...vizTracks.values()]));
  };

  try {
    const lk = await import("livekit-client");

    const attachRemote = (track: import("livekit-client").RemoteTrack) => {
      if (opts.videoEl && (track.kind === lk.Track.Kind.Video || track.kind === lk.Track.Kind.Audio)) {
        track.attach(opts.videoEl);
      }
      const media = track.mediaStreamTrack;
      if (media && (track.kind === lk.Track.Kind.Audio || track.kind === lk.Track.Kind.Video)) {
        vizTracks.set(media.id, media);
        publishViz();
      }
    };

    room.on(lk.RoomEvent.TrackSubscribed, (track) => attachRemote(track));
    room.on(lk.RoomEvent.TrackUnsubscribed, (track) => {
      const media = track.mediaStreamTrack;
      if (media) {
        vizTracks.delete(media.id);
        publishViz();
      }
    });
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track) attachRemote(pub.track);
      }
    }

    if (opts.canPublish) {
      if (opts.localStream) {
        for (const mediaTrack of opts.localStream.getTracks()) {
          await room.localParticipant.publishTrack(mediaTrack, {
            source: toLkPublishSource(lk, livekitPublishSourceKind(mediaTrack.kind, opts.hostSource)),
          });
          vizTracks.set(mediaTrack.id, mediaTrack);
        }
        publishViz();
        if (opts.videoEl) {
          opts.videoEl.srcObject = opts.localStream;
          opts.videoEl.muted = true;
          void opts.videoEl.play().catch(() => {});
        }
      } else if (opts.hostSource === "audio") {
        await room.localParticipant.setMicrophoneEnabled(true);
        const mic = room.localParticipant.getTrackPublication(lk.Track.Source.Microphone);
        if (mic?.track?.mediaStreamTrack) vizTracks.set(mic.track.mediaStreamTrack.id, mic.track.mediaStreamTrack);
        publishViz();
      } else if (opts.hostSource === "display" || opts.hostSource === "both") {
        await room.localParticipant.setScreenShareEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        const screen = room.localParticipant.getTrackPublication(lk.Track.Source.ScreenShare);
        const mic = room.localParticipant.getTrackPublication(lk.Track.Source.Microphone);
        if (opts.videoEl && screen?.track) {
          screen.track.attach(opts.videoEl);
          opts.videoEl.muted = true;
        }
        if (screen?.track?.mediaStreamTrack) vizTracks.set(screen.track.mediaStreamTrack.id, screen.track.mediaStreamTrack);
        if (mic?.track?.mediaStreamTrack) vizTracks.set(mic.track.mediaStreamTrack.id, mic.track.mediaStreamTrack);
        publishViz();
      } else if (opts.hostSource === "daw") {
        // VLink audio is published from the retained DAW stream, not camera.
      } else {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        const cam = room.localParticipant.getTrackPublication(lk.Track.Source.Camera);
        const mic = room.localParticipant.getTrackPublication(lk.Track.Source.Microphone);
        if (opts.videoEl && cam?.track) {
          cam.track.attach(opts.videoEl);
          opts.videoEl.muted = true;
        }
        if (cam?.track?.mediaStreamTrack) vizTracks.set(cam.track.mediaStreamTrack.id, cam.track.mediaStreamTrack);
        if (mic?.track?.mediaStreamTrack) vizTracks.set(mic.track.mediaStreamTrack.id, mic.track.mediaStreamTrack);
        publishViz();
      }
    }

    return {
      configured: true,
      connected: true,
      disconnect: async () => {
        localOwned.forEach((t) => t.stop());
        if (opts.releaseLocalOnDisconnect !== false) {
          opts.localStream?.getTracks().forEach((t) => t.stop());
        }
        vizTracks.clear();
        opts.onAnalyserStream?.(null);
        if (opts.videoEl) {
          opts.videoEl.srcObject = null;
          opts.videoEl.removeAttribute("src");
        }
        await baseDisconnect();
      },
    };
  } catch (e) {
    await baseDisconnect();
    return {
      configured: true,
      connected: false,
      disconnect: async () => {},
      error: e instanceof Error ? e.message : "sfu_join_failed",
    };
  }
}

export type RoomVoiceSession = {
  configured: boolean;
  connected: boolean;
  muted: boolean;
  setMuted: (muted: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
  error?: string;
};

/**
 * Join a social room voice channel (audio-only). Access gated server-side via can_access_room.
 */
export async function joinRoomVoiceSfu(opts: {
  roomId: string;
  canPublish?: boolean;
  /** Optional host element for remote audio elements. */
  audioHost?: HTMLElement | null;
  onParticipantCount?: (n: number) => void;
  /** Tricolor G/Y/P occupancy from LiveKit speaking activity. */
  onVoiceSlots?: (slots: VoiceSlotSnapshot) => void;
  /** Map LiveKit identity → display name (defaults to identity). */
  resolveName?: (identity: string) => string;
}): Promise<RoomVoiceSession> {
  const tokenRes = await mintRoomVoiceToken(opts.roomId, opts.canPublish !== false);
  if (!tokenRes.configured || !tokenRes.url || !tokenRes.token) {
    return {
      configured: false,
      connected: false,
      muted: true,
      setMuted: async () => {},
      disconnect: async () => {},
      error: tokenRes.error ?? "livekit_unconfigured",
    };
  }

  const conn = await connectLivekitRoom({
    url: tokenRes.url,
    token: tokenRes.token,
    audioMode: "speech",
  });
  if (!conn) {
    return {
      configured: true,
      connected: false,
      muted: true,
      setMuted: async () => {},
      disconnect: async () => {},
      error: "connect_failed",
    };
  }

  const { room, disconnect: baseDisconnect } = conn;
  let muted = false;
  const attached = new Set<HTMLMediaElement>();
  const slots = new VoiceSlotManager();
  let slotTimer: number | null = null;

  try {
    const lk = await import("livekit-client");
    const nameOf = (identity: string, fallback?: string | null) =>
      opts.resolveName?.(identity) || fallback || identity.slice(0, 8);

    const bumpCount = () => {
      opts.onParticipantCount?.(room.numParticipants);
    };

    const publishSlots = () => {
      opts.onVoiceSlots?.(slots.tick(Date.now()));
    };

    const attachAudio = (track: import("livekit-client").RemoteTrack) => {
      if (track.kind !== lk.Track.Kind.Audio) return;
      const el = track.attach();
      el.autoplay = true;
      (opts.audioHost ?? document.body).appendChild(el);
      attached.add(el);
    };

    room.on(lk.RoomEvent.TrackSubscribed, (track) => {
      attachAudio(track);
      bumpCount();
    });
    room.on(lk.RoomEvent.TrackUnsubscribed, () => bumpCount());
    room.on(lk.RoomEvent.ParticipantConnected, bumpCount);
    room.on(lk.RoomEvent.ParticipantDisconnected, (p) => {
      bumpCount();
      // Force-expire disconnected identities
      slots.noteSpeaking(p.identity, nameOf(p.identity, p.name), Date.now() - 10_000);
      publishSlots();
    });
    room.on(lk.RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const now = Date.now();
      for (const p of speakers) {
        if (p.isSpeaking || (p.audioLevel ?? 0) > 0.02) {
          slots.noteSpeaking(p.identity, nameOf(p.identity, p.name), now);
        }
      }
      // Local mic activity when unmuted
      const local = room.localParticipant;
      if (!muted && (local.isSpeaking || (local.audioLevel ?? 0) > 0.02)) {
        slots.noteSpeaking(local.identity, nameOf(local.identity, local.name), now);
      }
      publishSlots();
    });

    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track) attachAudio(pub.track);
      }
    }

    if (tokenRes.canPublish !== false && opts.canPublish !== false) {
      await room.localParticipant.setMicrophoneEnabled(true);
    } else {
      muted = true;
    }
    bumpCount();
    opts.onVoiceSlots?.(EMPTY_VOICE_SLOTS);
    slotTimer = window.setInterval(publishSlots, 250);

    const session: RoomVoiceSession = {
      configured: true,
      connected: true,
      muted,
      setMuted: async (next: boolean) => {
        muted = next;
        session.muted = next;
        await room.localParticipant.setMicrophoneEnabled(!next);
      },
      disconnect: async () => {
        if (slotTimer != null) window.clearInterval(slotTimer);
        slotTimer = null;
        slots.reset();
        opts.onVoiceSlots?.(EMPTY_VOICE_SLOTS);
        attached.forEach((el) => {
          el.remove();
        });
        attached.clear();
        await baseDisconnect();
      },
    };
    return session;
  } catch (e) {
    await baseDisconnect();
    return {
      configured: true,
      connected: false,
      muted: true,
      setMuted: async () => {},
      disconnect: async () => {},
      error: e instanceof Error ? e.message : "voice_join_failed",
    };
  }
}
