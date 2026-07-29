// Supabase Edge Function: processing-enqueue
// Authenticated POST { kind, engine?, releaseId?, inputMeta?, idempotencyKey? }
// Inserts a durable processing_jobs row (queued). No paid AI — skeleton only.
// Deploy with JWT verification ON (default).

import { admin, CORS, callerId, json } from "../_shared/edge.ts";

const KINDS = new Set(["waveform", "loudness", "analyze_audio", "analyze_artwork"]);
const ENGINES = new Set(["portable", "native", "remote"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  let body: {
    kind?: string;
    engine?: string;
    releaseId?: string;
    inputMeta?: Record<string, unknown>;
    idempotencyKey?: string;
    storageBytes?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const kind = (body.kind ?? "").trim();
  if (!KINDS.has(kind)) return json({ error: "invalid_kind" }, 400);
  const engine = (body.engine ?? "remote").trim();
  if (!ENGINES.has(engine)) return json({ error: "invalid_engine" }, 400);

  const idempotencyKey = body.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const existing = await admin
      .from("processing_jobs")
      .select("id, state, engine, created_at, result")
      .eq("owner_id", uid)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing.data) {
      return json({
        ok: true,
        jobId: existing.data.id,
        status: existing.data.state,
        engine: existing.data.engine,
        createdAt: existing.data.created_at,
        replay: true,
      });
    }
  }

  const insert = await admin
    .from("processing_jobs")
    .insert({
      owner_id: uid,
      release_id: body.releaseId ?? null,
      kind,
      engine,
      state: "queued",
      idempotency_key: idempotencyKey,
      input_meta: body.inputMeta ?? {},
      storage_bytes: Math.max(0, Math.floor(body.storageBytes ?? 0)),
      job_minutes: 0,
    })
    .select("id, state, engine, created_at")
    .single();

  if (insert.error) {
    return json({ error: "insert_failed", detail: insert.error.message }, 500);
  }

  // Skeleton worker tick: mark running → completed with empty stub (no paid compute).
  const jobId = insert.data.id as string;
  await admin
    .from("processing_jobs")
    .update({
      state: "running",
    })
    .eq("id", jobId)
    .eq("owner_id", uid);

  const stubResult = {
    ok: true,
    skeleton: true,
    message: "Remote worker skeleton — no paid AI; client portable/native preferred.",
  };

  await admin
    .from("processing_jobs")
    .update({
      state: "completed",
      result: stubResult,
      job_minutes: 0.001,
    })
    .eq("id", jobId)
    .eq("owner_id", uid);

  return json({
    ok: true,
    jobId,
    status: "completed",
    engine: insert.data.engine,
    createdAt: insert.data.created_at,
    result: stubResult,
  });
});
