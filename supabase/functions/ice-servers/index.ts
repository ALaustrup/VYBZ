// Supabase Edge Function: ice-servers
// Returns STUN (+ optional TURN) for WebRTC. Deploy with --no-verify-jwt (self-auth).
import { CORS, json, callerId } from "../_shared/edge.ts";

const STUN: RTCIceServerLike[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface RTCIceServerLike {
  urls: string | string[];
  username?: string;
  credential?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const servers: RTCIceServerLike[] = [...STUN];

  const turnUrls = (Deno.env.get("TURN_URLS") ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const turnUser = Deno.env.get("TURN_USERNAME") ?? "";
  const turnCred = Deno.env.get("TURN_CREDENTIAL") ?? "";

  if (turnUrls.length && turnUser && turnCred) {
    for (const url of turnUrls) {
      servers.push({ urls: url, username: turnUser, credential: turnCred });
    }
  }

  return json({
    iceServers: servers,
    turnConfigured: turnUrls.length > 0 && !!turnUser && !!turnCred,
    ttlSec: 600,
  });
});
