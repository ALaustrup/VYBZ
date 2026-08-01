// Supabase Edge Function: ai-metadata
// Authenticated POST { title?, artist?, keywords?, fixture? }
// Suggests genre and mood from the title and artist text. Returns "unavailable" when no
// model is configured — it never guesses, and it never produces tempo, key or an ISRC.
// Deploy with JWT verification ON. Secret: GROQ_API_KEY.

import { CORS, admin, callerId, json } from "../_shared/edge.ts";

const PROC_VERSION = "metadata.2";
const MODEL = "llama-3.1-8b-instant";
const USD_PER_CALL = 0.002;

type Suggestion = {
  genre: string | null;
  mood: string | null;
  procVersion: string;
  source: "fixture" | "ai-guess" | "unavailable";
};

const FIXTURE: Suggestion = {
  genre: "Electronic",
  mood: "Upbeat",
  procVersion: PROC_VERSION,
  source: "fixture",
};

const UNAVAILABLE: Suggestion = {
  genre: null,
  mood: null,
  procVersion: PROC_VERSION,
  source: "unavailable",
};

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
    projectId?: string;
    fixture?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  let result: Suggestion = body.fixture ? { ...FIXTURE } : { ...UNAVAILABLE };
  const key = Deno.env.get("GROQ_API_KEY") ?? "";

  if (!body.fixture && key) {
    try {
      const system =
        `You suggest a genre and a mood for an independent music release, based only on ` +
        `its title and artist name. Return ONLY JSON with keys: genre (string), mood (string). ` +
        `If the text gives you no reasonable basis, return null for that key. ` +
        `Never invent a tempo, a musical key, or an ISRC.`;
      const user = `Title: ${body.title ?? ""}\nArtist: ${body.artist ?? ""}\nKeywords: ${body.keywords ?? ""}`;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          max_tokens: 200,
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
        const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}") as Record<
          string,
          unknown
        >;
        const text = (v: unknown) =>
          typeof v === "string" && v.trim() ? v.trim().slice(0, 64) : null;
        const genre = text(parsed.genre);
        const mood = text(parsed.mood);
        // Only claim a guess was made if the model actually returned one.
        result = genre || mood
          ? { genre, mood, procVersion: PROC_VERSION, source: "ai-guess" }
          : { ...UNAVAILABLE };
      }
    } catch (e) {
      console.error("ai-metadata groq", (e as Error).message);
      result = { ...UNAVAILABLE };
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
    p_usd_estimate: result.source === "ai-guess" ? USD_PER_CALL : 0,
    p_meta: { job_id: job?.id ?? null, source: result.source },
  });

  return json({
    jobId: job?.id ?? null,
    status: "completed",
    ...result,
  });
});
