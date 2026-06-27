// lifeline-token — mint a LiveKit access token for both parties of an active
// Lifeline session, so they can switch to voice if they both agree.
//
// Voice is opt-in by both sides (consent flows through the existing realtime
// broadcast channel in lib/backend.joinLifelineRoom — no DB change needed).
// The session shell still lives in `lifeline_sessions`; this function just
// authorizes either participant to publish/subscribe in the matching LiveKit
// room. Audio-only (canPublishVideo is false) — no video, no recording, ever.
//
// Required secrets:
//   LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy lifeline-token

import { AccessToken } from "npm:livekit-server-sdk@2";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LIVEKIT_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const LIVEKIT_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes } = await admin.auth.getUser(jwt);
  const userId = userRes.user?.id;
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const sessionId = body.session_id;
  if (!sessionId) return json({ error: "session_id required" }, 400);

  // Caller must be one of the two parties on an ACTIVE session.
  const { data: session } = await admin
    .from("lifeline_sessions")
    .select("id,requester_id,lifeline_id,ended_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return json({ error: "not found" }, 404);
  if (session.ended_at) return json({ error: "session ended" }, 410);
  if (session.requester_id !== userId && session.lifeline_id !== userId) {
    return json({ error: "not a participant" }, 403);
  }

  const room = `myvyb-lifeline-${sessionId}`;
  const at = new AccessToken(LIVEKIT_KEY, LIVEKIT_SECRET, {
    identity: userId,
    name: userId,
    ttl: 60 * 60, // 1h
  });
  at.addGrant({
    room,
    roomJoin: true,
    // Both parties may publish audio; video is disabled so this stays voice-only.
    canPublish: true,
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  });
  const token = await at.toJwt();
  return json({ token, url: LIVEKIT_URL, room });
});
