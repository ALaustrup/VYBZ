// live-token — mint a short-lived LiveKit access token for the current user.
//
// Two roles:
//   - publisher: the streamer (start their own stream's room, can publish)
//   - viewer:    a watcher (subscribe-only, cannot publish, no chat-data perms)
//
// Server enforces:
//   - The publisher must own the stream row (auth.uid() == live_streams.user_id).
//   - Viewers must be in the same age_layer as the stream.
//   - NSFW streams require the viewer's nsfw_opt_in.
//   - Ended streams refuse tokens (so a closed/auto-killed stream can't be rejoined).
//
// Required secrets (supabase secrets set ...):
//   LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL  (e.g. wss://myvyb-xxxxx.livekit.cloud)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy live-token

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

  // Use the caller's JWT so auth.uid() resolves to them.
  const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userRes } = await userClient.auth.getUser(jwt);
  const userId = userRes.user?.id;
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: { stream_id?: string; role?: "publisher" | "viewer" };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const streamId = body.stream_id;
  const role = body.role === "publisher" ? "publisher" : "viewer";
  if (!streamId) return json({ error: "stream_id required" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Look up the stream.
  const { data: stream } = await admin
    .from("live_streams")
    .select("id,user_id,age_layer,nsfw,ended_at,room_id")
    .eq("id", streamId)
    .maybeSingle();
  if (!stream) return json({ error: "stream not found" }, 404);
  if (stream.ended_at) return json({ error: "stream ended" }, 410);

  // Look up the caller's profile for eligibility checks.
  const { data: me } = await admin
    .from("profiles")
    .select("age,gender,anonymous,banned,nsfw_opt_in")
    .eq("id", userId)
    .maybeSingle();
  if (!me) return json({ error: "no profile" }, 403);
  if (me.banned) return json({ error: "banned" }, 403);

  if (role === "publisher") {
    if (stream.user_id !== userId) return json({ error: "not your stream" }, 403);
    if (me.anonymous || me.age == null || me.gender == null)
      return json({ error: "verify your account first" }, 403);
  } else {
    // Viewer rules.
    const myLayer = (me.age ?? 0) < 18 ? "teen" : "adult";
    if (myLayer !== stream.age_layer) return json({ error: "age layer mismatch" }, 403);
    if (stream.nsfw && !me.nsfw_opt_in) return json({ error: "nsfw not enabled" }, 403);
  }

  // Resolve/lock the LiveKit room id for this stream (one room per stream).
  const roomId = stream.room_id ?? `myvyb-live-${streamId}`;
  if (!stream.room_id) {
    await admin.from("live_streams").update({ room_id: roomId }).eq("id", streamId);
  }

  // Mint a short-lived token.
  const at = new AccessToken(LIVEKIT_KEY, LIVEKIT_SECRET, {
    identity: userId,
    name: userId,
    ttl: 60 * 60, // 1h; viewers can request a fresh one on swipe-to-next
  });
  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: role === "publisher",
    canPublishData: role === "publisher",
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  });
  const token = await at.toJwt();

  return json({ token, url: LIVEKIT_URL, room: roomId, role });
});
