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
