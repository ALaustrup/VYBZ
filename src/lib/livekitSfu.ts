/**
 * Unified Social Live — LiveKit SFU client helpers (Phase 2).
 * Degrades gracefully when LiveKit secrets / SDK are unavailable.
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "@/lib/supabase";

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
  videoEl?: HTMLVideoElement | null;
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

  try {
    const lk = await import("livekit-client");

    const attachRemote = (track: import("livekit-client").RemoteTrack) => {
      if (!opts.videoEl) return;
      if (track.kind === lk.Track.Kind.Video || track.kind === lk.Track.Kind.Audio) {
        track.attach(opts.videoEl);
      }
    };

    room.on(lk.RoomEvent.TrackSubscribed, (track) => attachRemote(track));
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track) attachRemote(pub.track);
      }
    }

    if (opts.canPublish) {
      if (opts.localStream) {
        for (const mediaTrack of opts.localStream.getTracks()) {
          await room.localParticipant.publishTrack(mediaTrack, {
            source:
              mediaTrack.kind === "video"
                ? lk.Track.Source.Camera
                : lk.Track.Source.Microphone,
          });
        }
        if (opts.videoEl) {
          opts.videoEl.srcObject = opts.localStream;
          opts.videoEl.muted = true;
          void opts.videoEl.play().catch(() => {});
        }
      } else {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        const cam = room.localParticipant.getTrackPublication(lk.Track.Source.Camera);
        if (opts.videoEl && cam?.track) {
          cam.track.attach(opts.videoEl);
          opts.videoEl.muted = true;
        }
      }
    }

    return {
      configured: true,
      connected: true,
      disconnect: async () => {
        localOwned.forEach((t) => t.stop());
        opts.localStream?.getTracks().forEach((t) => t.stop());
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
