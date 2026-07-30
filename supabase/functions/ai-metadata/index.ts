// Supabase Edge Function: ai-metadata
// Authenticated POST { title?, artist?, keywords?, durationSeconds?, fixture? }
// Groq infer-fill genre/mood/BPM/ISRC suggestion. Falls back to heuristic if key missing.
// Deploy with JWT verification ON. Secret: GROQ_API_KEY (already set).

import { CORS, admin, callerId, json } from "../_shared/edge.ts";

const PROC_VERSION = "phase15.metadata.1";
const MODEL = "llama-3.1-8b-instant";
const USD_PER_CALL = 0.002;

const FIXTURE = {
  genre: "Electronic",
  mood: "Upbeat",
  bpm: 122,
  isrcSuggestion: "QZVYZ2500001",
  confidence: 0.82,
  procVersion: PROC_VERSION,
  source: "fixture" as const,
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function heuristic(body: {
  title?: string;
  artist?: string;
  keywords?: string;
  durationSeconds?: number;
}) {
  const GENRES = ["Electronic", "Hip-Hop", "Pop", "Indie", "R&B", "Rock", "Ambient"];
  const MOODS = ["Upbeat", "Melancholic", "Dark", "Dreamy", "Aggressive", "Chill"];
  const seed = hashSeed(
    `${body.title ?? ""}|${body.artist ?? ""}|${body.keywords ?? ""}|${body.durationSeconds ?? 0}`
  );
  return {
    genre: GENRES[seed % GENRES.length]!,
    mood: MOODS[(seed >>> 8) % MOODS.length]!,
    bpm: 70 + (seed % 90),
    isrcSuggestion: `QZVYZ${String(2500000 + (seed % 100000)).padStart(7, "0")}`,
    confidence: 0.55 + ((seed >>> 16) % 30) / 100,
    procVersion: PROC_VERSION,
    source: "heuristic" as const,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const { data: flag } = await admin
    .from("edge_flags")
    .select("enabled")
    .eq("flag_name", "feature:ai_metadata:disabled")
    .maybeSingle();
  if (flag?.enabled) return json({ error: "ai_metadata_disabled" }, 403);

  let body: {
    title?: string;
    artist?: string;
    keywords?: string;
    durationSeconds?: number;
    projectId?: string;
    fixture?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  let result = body.fixture ? { ...FIXTURE } : heuristic(body);
  const key = Deno.env.get("GROQ_API_KEY") ?? "";

  if (!body.fixture && key) {
    try {
      const system =
        `You infer music metadata for indie releases on VYBZ. Return ONLY JSON keys: ` +
        `genre (string), mood (string), bpm (number 60-200), isrcSuggestion (string like QZVYZ########), confidence (0-1).`;
      const user = `Title: ${body.title ?? ""}\nArtist: ${body.artist ?? ""}\nKeywords: ${body.keywords ?? ""}\nDuration: ${body.durationSeconds ?? 0}s`;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (res.ok) {
        const payload = await res.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = payload.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        result = {
          genre: String(parsed.genre ?? result.genre).slice(0, 64),
          mood: String(parsed.mood ?? result.mood).slice(0, 64),
          bpm: Math.max(60, Math.min(200, Number(parsed.bpm) || result.bpm)),
          isrcSuggestion: String(parsed.isrcSuggestion ?? result.isrcSuggestion).slice(0, 16),
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
          procVersion: PROC_VERSION,
          source: "groq",
        };
      }
    } catch (e) {
      console.error("ai-metadata groq", (e as Error).message);
    }
  }

  const { data: job } = await admin
    .from("processing_jobs_ai")
    .insert({
      user_id: uid,
      project_id: body.projectId || null,
      type: "ai_metadata",
      status: "completed",
      version: PROC_VERSION,
      meta: { result },
    })
    .select("id")
    .single();

  if (job?.id) {
    await admin.from("processing_results").insert({
      job_id: job.id,
      user_id: uid,
      project_id: body.projectId || null,
      kind: "metadata",
      proc_version: PROC_VERSION,
      payload: result,
    });
  }

  await admin.rpc("record_cost_event", {
    p_feature: "ai_metadata",
    p_units: 1,
    p_usd_estimate: result.source === "groq" ? USD_PER_CALL : 0,
    p_meta: { job_id: job?.id ?? null, source: result.source },
  });

  return json({
    jobId: job?.id ?? null,
    status: "completed",
    ...result,
  });
});
