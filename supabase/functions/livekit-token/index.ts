// Supabase Edge Function: livekit-token
// Mints LiveKit JWTs for Unified Social Live (public live + room voice).
// Deploy with --no-verify-jwt (self-auth via caller JWT).
//
// Env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
//
// POST { purpose: "live"|"voice", sessionId?: uuid, roomId?: uuid, canPublish?: boolean }
// → { url, token, room, audioMode, configured: true } | 503 if secrets missing

import { CORS, json, callerId, admin } from "../_shared/edge.ts";

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signLivekitJwt(opts: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name?: string;
  room: string;
  canPublish: boolean;
  canSubscribe: boolean;
  ttlSec?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (opts.ttlSec ?? 7200);
  const header = { alg: "HS256", typ: "JWT" };
  const video: Record<string, unknown> = {
    roomJoin: true,
    room: opts.room,
    canPublish: opts.canPublish,
    canSubscribe: opts.canSubscribe,
    canPublishData: true,
  };
  // Producer / music mode: allow high-quality publish without treating as tiny webcam
  if (opts.canPublish) {
    video.canPublishSources = ["camera", "microphone", "screen_share", "screen_share_audio"];
  }
  const payload: Record<string, unknown> = {
    iss: opts.apiKey,
    sub: opts.identity,
    nbf: now - 10,
    exp,
    name: opts.name ?? opts.identity,
    video,
    metadata: JSON.stringify({ vybz: true }),
  };
  const enc = new TextEncoder();
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(opts.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(`${head}.${body}`)),
  );
  return `${head}.${body}.${b64url(sig)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("LIVEKIT_URL") ?? "";
  const apiKey = Deno.env.get("LIVEKIT_API_KEY") ?? "";
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
  if (!url || !apiKey || !apiSecret) {
    return json({
      configured: false,
      error: "livekit_not_configured",
      hint: "Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET on Edge secrets",
    }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const purpose = body.purpose as string;
  const canPublishReq = body.canPublish !== false;

  const { data: profile } = await admin.from("profiles").select("username").eq("id", uid).maybeSingle();
  const display = (profile?.username as string | undefined) ?? uid.slice(0, 8);

  if (purpose === "live") {
    const sessionId = body.sessionId as string;
    if (!sessionId) return json({ error: "sessionId_required" }, 400);
    const { data: session, error } = await admin
      .from("live_sessions")
      .select("id,host_id,status,livekit_room,sfu_provider,audio_mode")
      .eq("id", sessionId)
      .maybeSingle();
    if (error || !session || session.status !== "live") {
      return json({ error: "session_not_live" }, 404);
    }
    const isHost = session.host_id === uid;
    let room = session.livekit_room as string | null;
    if (isHost && !room) {
      room = `vybz-live-${sessionId}`;
      await admin.from("live_sessions").update({
        sfu_provider: "livekit",
        livekit_room: room,
        audio_mode: session.audio_mode ?? "music",
      }).eq("id", sessionId);
    }
    if (!room) return json({ error: "sfu_room_not_ready" }, 409);

    const token = await signLivekitJwt({
      apiKey,
      apiSecret,
      identity: uid,
      name: display,
      room,
      canPublish: isHost && canPublishReq,
      canSubscribe: true,
    });
    return json({
      configured: true,
      url,
      token,
      room,
      role: isHost ? "host" : "viewer",
      audioMode: session.audio_mode ?? "music",
      canPublish: isHost && canPublishReq,
    });
  }

  if (purpose === "voice") {
    const roomId = body.roomId as string;
    if (!roomId) return json({ error: "roomId_required" }, 400);

    const { data: access } = await admin.rpc("can_access_room", { p_room: roomId, p_uid: uid });
    if (!access) return json({ error: "forbidden" }, 403);

    const { data: roomRow } = await admin
      .from("rooms")
      .select("id,voice_enabled,livekit_room,owner_id")
      .eq("id", roomId)
      .maybeSingle();
    if (!roomRow?.voice_enabled) return json({ error: "voice_disabled" }, 400);

    let room = roomRow.livekit_room as string | null;
    if (!room) {
      room = `vybz-voice-${roomId}`;
      await admin.from("rooms").update({ livekit_room: room }).eq("id", roomId);
    }

    const canPublish = canPublishReq; // members with access may speak; Phase 5 may add priority slots
    const token = await signLivekitJwt({
      apiKey,
      apiSecret,
      identity: uid,
      name: display,
      room,
      canPublish,
      canSubscribe: true,
    });
    return json({
      configured: true,
      url,
      token,
      room,
      role: roomRow.owner_id === uid ? "owner" : "member",
      audioMode: "music",
      canPublish,
    });
  }

  return json({ error: "invalid_purpose" }, 400);
});
