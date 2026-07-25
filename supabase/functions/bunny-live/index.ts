// Supabase Edge Function: bunny-live
//
// Provisions Bunny Stream *live* objects for VYBZ public creator streams.
// Actions (POST JSON):
//   status             → { configured, libraryIdSet, apiKeySet }  (works without secrets)
//   create  { title }  → { guid, playbackHls, rtmpUrl, streamKey }
//   end     { guid }   → { ok: true }
//
// Env (server only):
//   BUNNY_STREAM_LIBRARY_ID   — numeric library id
//   BUNNY_STREAM_API_KEY      — library AccessKey
//   BUNNY_STREAM_RTMP_BASE    — optional override; default from Bunny ingestEndpoints
//
// VOD recording is OFF (ephemeral 24h sessions managed in Postgres expires_at).
// Deploy with --no-verify-jwt (we verify the caller JWT ourselves).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const LIBRARY_ID = Deno.env.get("BUNNY_STREAM_LIBRARY_ID") ?? "";
const API_KEY = Deno.env.get("BUNNY_STREAM_API_KEY") ?? "";
const RTMP_BASE = Deno.env.get("BUNNY_STREAM_RTMP_BASE") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function bunny(path: string, init?: RequestInit) {
  return fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}${path}`, {
    ...init,
    headers: {
      AccessKey: API_KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: auth, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !auth?.user?.id) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  // Probe without creating — works even when Stream secrets are absent.
  if (action === "status") {
    return json({
      configured: !!(LIBRARY_ID && API_KEY),
      libraryIdSet: !!LIBRARY_ID,
      apiKeySet: !!API_KEY,
    });
  }

  if (!LIBRARY_ID || !API_KEY) {
    return json({ error: "bunny_stream_not_configured", configured: false }, 503);
  }

  if (action === "create") {
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "Live on VYBZ";

    // Create live stream — recordVod false (ephemeral; our DB expires_at = 24h).
    const createRes = await bunny("/live", {
      method: "POST",
      body: JSON.stringify({
        title,
        description: `VYBZ live · host ${auth.user.id.slice(0, 8)}`,
        public: true,
        dvrEnabled: false,
        recordVod: false,
      }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      return json({ error: "bunny_create_failed", detail: errText.slice(0, 400) }, 502);
    }
    const created = await createRes.json();
    const guid = created.guid ?? created.Guid ?? created.id;
    if (!guid) return json({ error: "bunny_missing_guid" }, 502);

    // Mark started so playback is available.
    await bunny(`/live/${guid}/start`, { method: "POST" }).catch(() => null);

    // Re-fetch for ingest/playback fields (shape varies slightly by API version).
    const getRes = await bunny(`/live/${guid}`);
    const live = getRes.ok ? await getRes.json() : created;

    const streamKey = live.streamKey ?? live.StreamKey ?? live.stream_key ?? null;
    const playbackHls = live.playbackUrlHls ?? live.PlaybackUrlHls ?? live.playback_url_hls ?? null;
    // Bunny Live returns the OBS server under ingestEndpoints.rtmp (not a region subdomain).
    const ingest = live.ingestEndpoints?.rtmp ?? live.IngestEndpoints?.rtmp ?? {};
    const rtmpUrl = RTMP_BASE
      || ingest.primaryIngestUrl
      || ingest.PrimaryIngestUrl
      || live.rtmpUrl
      || live.RtmpUrl
      || "rtmp://global.rtmp.mediadelivery.net/live";

    return json({
      configured: true,
      guid,
      playbackHls,
      rtmpUrl,
      streamKey,
      backupRtmpUrl: ingest.backupIngestUrl ?? ingest.BackupIngestUrl ?? null,
    });
  }

  if (action === "end") {
    const guid = body.guid as string;
    if (!guid) return json({ error: "missing_guid" }, 400);
    await bunny(`/live/${guid}/stop`, { method: "POST" }).catch(() => null);
    await bunny(`/live/${guid}`, { method: "DELETE" }).catch(() => null);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
