/**
 * Vibes Radio — server clock sync / advance / opt-in.
 * Logic only: never embed audio bytes (beds live at /audio/*.wav on CDN).
 * Deploy: supabase functions deploy vibes-radio --no-verify-jwt
 */
import { admin, CORS, callerId, json } from "../_shared/edge.ts";

const GREETING = {
  kind: "greeting" as const,
  audio_url: "/audio/1.wav",
  title: "You're what's next",
  artist: "VYBZ",
  duration_sec: 9.125,
  source: "station" as const,
};

const INTERSTITIAL = {
  kind: "interstitial" as const,
  audio_url: "/audio/2.wav",
  title: "Hear something new",
  artist: "VYBZ",
  duration_sec: 7.875,
  source: "station" as const,
};

type QueueKind = "greeting" | "interstitial" | "user_track" | "artist_cue" | "stinger";

type BroadcastRow = {
  id: number;
  current_item_id: string | null;
  kind: QueueKind;
  started_at: string;
  duration_sec: number;
  title: string;
  artist: string | null;
  audio_url: string;
  drop_id: string | null;
  updated_at: string;
};

type QueueRow = {
  id: string;
  position: number;
  kind: QueueKind;
  audio_url: string;
  title: string;
  artist: string | null;
  duration_sec: number;
  drop_id: string | null;
  pool_id: string | null;
  source: string;
};

function serverNowIso(): string {
  return new Date().toISOString();
}

async function nextQueuePosition(): Promise<number> {
  const { data } = await admin
    .from("vibes_radio_queue")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

async function enqueue(item: {
  kind: QueueKind;
  audio_url: string;
  title: string;
  artist: string | null;
  duration_sec: number;
  drop_id?: string | null;
  pool_id?: string | null;
  source: string;
}): Promise<QueueRow | null> {
  const position = await nextQueuePosition();
  const { data, error } = await admin
    .from("vibes_radio_queue")
    .insert({
      position,
      kind: item.kind,
      audio_url: item.audio_url,
      title: item.title,
      artist: item.artist,
      duration_sec: item.duration_sec,
      drop_id: item.drop_id ?? null,
      pool_id: item.pool_id ?? null,
      source: item.source,
    })
    .select("*")
    .single();
  if (error) {
    console.warn("enqueue failed", error.message);
    return null;
  }
  return data as QueueRow;
}

async function pickRandomPool(): Promise<{
  id: string;
  audio_url: string;
  title: string;
  artist: string | null;
  duration_sec: number;
  drop_id: string | null;
} | null> {
  const { data, error } = await admin
    .from("vibes_radio_pool")
    .select("id, audio_url, title, artist, duration_sec, drop_id")
    .eq("status", "active")
    .limit(40);
  if (error || !data?.length) return null;
  return data[Math.floor(Math.random() * data.length)] as {
    id: string;
    audio_url: string;
    title: string;
    artist: string | null;
    duration_sec: number;
    drop_id: string | null;
  };
}

/**
 * Queue a catalog/pool track. "Hear something new" is only a bumper immediately
 * before that track — never a standalone filler that can loop forever.
 */
async function enqueueUserTrackWithInterstitial(item: {
  audio_url: string;
  title: string;
  artist: string | null;
  duration_sec: number;
  drop_id?: string | null;
  pool_id?: string | null;
  source: string;
}): Promise<void> {
  const { data: pending } = await admin
    .from("vibes_radio_queue")
    .select("kind")
    .order("position", { ascending: true })
    .limit(32);
  const last = pending?.length ? pending[pending.length - 1] : null;
  const broadcast = await loadBroadcast();
  const queueEmpty = !pending?.length;
  // Current bumper already covers the next track — do not stack another interstitial.
  const currentCoversNext =
    queueEmpty && broadcast?.kind === "interstitial";

  if (last?.kind !== "interstitial" && !currentCoversNext) {
    await enqueue({ ...INTERSTITIAL, artist: INTERSTITIAL.artist });
  }

  await enqueue({
    kind: "user_track",
    audio_url: item.audio_url,
    title: item.title,
    artist: item.artist,
    duration_sec: item.duration_sec,
    drop_id: item.drop_id ?? null,
    pool_id: item.pool_id ?? null,
    source: item.source,
  });
}

async function refillQueue(preferGreeting: boolean): Promise<void> {
  const { data: pending } = await admin
    .from("vibes_radio_queue")
    .select("id, kind")
    .order("position", { ascending: true })
    .limit(16);

  const userTracksQueued = (pending ?? []).filter((r) => r.kind === "user_track").length;
  // Keep a small runway of real tracks — never pad with interstitial-only rows.
  let need = Math.max(0, 2 - userTracksQueued);
  if (need === 0) return;

  let added = 0;
  while (added < need) {
    const pool = await pickRandomPool();
    if (!pool) break;

    if (preferGreeting && added === 0) {
      await enqueue({ ...GREETING, artist: GREETING.artist });
    }

    await enqueueUserTrackWithInterstitial({
      audio_url: pool.audio_url,
      title: pool.title,
      artist: pool.artist,
      duration_sec: pool.duration_sec,
      drop_id: pool.drop_id,
      pool_id: pool.id,
      source: "pool",
    });
    added += 1;
  }
}

async function applyItem(row: QueueRow): Promise<BroadcastRow | null> {
  const started = serverNowIso();
  const { data, error } = await admin
    .from("vibes_radio_broadcast")
    .update({
      current_item_id: row.id,
      kind: row.kind,
      started_at: started,
      duration_sec: row.duration_sec,
      title: row.title,
      artist: row.artist,
      audio_url: row.audio_url,
      drop_id: row.drop_id,
      updated_at: started,
    })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) {
    console.warn("broadcast update failed", error.message);
    return null;
  }
  await admin.from("vibes_radio_queue").delete().eq("id", row.id);
  return data as BroadcastRow;
}

async function advanceIfNeeded(broadcast: BroadcastRow, preferGreeting: boolean): Promise<BroadcastRow> {
  const startedMs = Date.parse(broadcast.started_at);
  const elapsed = (Date.now() - startedMs) / 1000;
  if (elapsed < broadcast.duration_sec - 0.05) return broadcast;

  await refillQueue(preferGreeting);

  // Drop orphan bumpers (interstitial with no following catalog track) left by older fills.
  for (let guard = 0; guard < 8; guard++) {
    const { data: head } = await admin
      .from("vibes_radio_queue")
      .select("*")
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!head) return broadcast;

    if (head.kind === "interstitial") {
      const { data: rest } = await admin
        .from("vibes_radio_queue")
        .select("kind")
        .neq("id", head.id)
        .order("position", { ascending: true })
        .limit(8);
      const hasFollowingTrack = (rest ?? []).some(
        (r) => r.kind === "user_track" || r.kind === "artist_cue",
      );
      if (!hasFollowingTrack) {
        await admin.from("vibes_radio_queue").delete().eq("id", head.id);
        continue;
      }
    }

    return (await applyItem(head as QueueRow)) ?? broadcast;
  }

  // Empty runway: stay on the finished item (idle). Do not loop "Hear something new".
  return broadcast;
}

function payloadFor(broadcast: BroadcastRow, audience: "guest" | "member") {
  const serverNow = serverNowIso();
  const startedMs = Date.parse(broadcast.started_at);
  const elapsedSec = Math.max(0, (Date.now() - startedMs) / 1000);
  let kind: QueueKind = broadcast.kind;
  let audioUrl = broadcast.audio_url;
  let title = broadcast.title;
  let artist = broadcast.artist;
  let durationSec = broadcast.duration_sec;
  let guestSafe = kind !== "greeting";
  let positionSec = Math.min(elapsedSec, Math.max(0, durationSec - 0.05));

  if (audience === "guest" && broadcast.kind === "greeting") {
    guestSafe = true;
    kind = "interstitial";
    audioUrl = INTERSTITIAL.audio_url;
    title = INTERSTITIAL.title;
    artist = INTERSTITIAL.artist;
    durationSec = INTERSTITIAL.duration_sec;
    positionSec = Math.min(elapsedSec, Math.max(0, durationSec - 0.05));
  }

  return {
    trackId: broadcast.current_item_id ?? `broadcast-${broadcast.kind}`,
    kind,
    startedAt: broadcast.started_at,
    serverNow,
    durationSec,
    positionSec,
    title,
    artist,
    audioUrl,
    dropId: broadcast.drop_id,
    guestSafe,
    metadata: {
      format: audioUrl.endsWith(".wav") ? "wav" : "unknown",
      durationSec,
    },
  };
}

async function loadBroadcast(): Promise<BroadcastRow | null> {
  const { data, error } = await admin.from("vibes_radio_broadcast").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return data as BroadcastRow;
}

async function handleSync(audience: "guest" | "member"): Promise<Response> {
  const preferGreeting = audience === "member";
  const row = await loadBroadcast();
  if (!row) return json({ error: "broadcast_unavailable" }, 503);
  const broadcast = await advanceIfNeeded(row, preferGreeting);
  return json(payloadFor(broadcast, audience));
}

async function handleOptIn(req: Request, body: {
  dropId?: string;
  audioUrl?: string;
  title?: string;
  artist?: string | null;
  durationSec?: number;
}): Promise<Response> {
  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  if (!body.dropId || !body.audioUrl || !(body.durationSec && body.durationSec > 0)) {
    return json({ error: "invalid_body" }, 400);
  }

  const { data: drop, error: dropErr } = await admin
    .from("drops")
    .select("id, author_id, title, audio_url")
    .eq("id", body.dropId)
    .maybeSingle();

  if (dropErr || !drop) return json({ error: "drop_not_found" }, 404);
  if (drop.author_id !== uid) return json({ error: "forbidden" }, 403);

  const title = (body.title || drop.title || "Untitled").slice(0, 120);
  const artist = (body.artist ?? null)?.slice(0, 80) ?? null;

  const { data: pool, error } = await admin
    .from("vibes_radio_pool")
    .upsert(
      {
        drop_id: body.dropId,
        owner_id: uid,
        audio_url: body.audioUrl,
        title,
        artist,
        duration_sec: body.durationSec,
        status: "active",
      },
      { onConflict: "drop_id" },
    )
    .select("id")
    .single();

  if (error) return json({ error: "pool_upsert_failed", detail: error.message }, 500);

  await enqueueUserTrackWithInterstitial({
    audio_url: body.audioUrl,
    title,
    artist,
    duration_sec: body.durationSec,
    drop_id: body.dropId,
    pool_id: pool.id,
    source: "pool",
  });

  return json({ ok: true, poolId: pool.id });
}

async function handleTick(req: Request): Promise<Response> {
  const secret = Deno.env.get("VIBES_RADIO_TICK_SECRET") ?? "";
  const hdr = req.headers.get("x-vibes-radio-secret") ?? "";
  if (!secret || hdr !== secret) return json({ error: "forbidden" }, 403);
  const row = await loadBroadcast();
  if (!row) return json({ error: "missing" }, 503);
  const next = await advanceIfNeeded(row, true);
  return json(payloadFor(next, "member"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const qsAction = url.searchParams.get("action");

  if (req.method === "GET") {
    if (qsAction === "tick") return handleTick(req);
    const uid = await callerId(req);
    const audience = uid && url.searchParams.get("audience") !== "guest" ? "member" : "guest";
    return handleSync(audience);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({})) as {
      action?: string;
      audience?: string;
      dropId?: string;
      audioUrl?: string;
      title?: string;
      artist?: string | null;
      durationSec?: number;
    };
    const action = body.action ?? qsAction ?? "sync";
    if (action === "opt_in") return handleOptIn(req, body);
    if (action === "tick") return handleTick(req);
    const uid = await callerId(req);
    const audience =
      body.audience === "guest" || !uid
        ? "guest"
        : "member";
    return handleSync(audience);
  }

  return json({ error: "method_not_allowed" }, 405);
});
