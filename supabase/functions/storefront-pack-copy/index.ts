// Supabase Edge Function: storefront-pack-copy
// Authenticated POST { keywords, genre? } → { title, description, features[] }
// Uses Groq for premium sample-pack marketing copy. Secret: GROQ_API_KEY.
// Deploy with JWT verification ON (default). Graceful: returns 503 if key missing.

import { CORS, callerId, json } from "../_shared/edge.ts";

const MAX_KEYWORDS = 240;
const MODEL = "llama-3.1-8b-instant";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const key = Deno.env.get("GROQ_API_KEY") ?? "";
  if (!key) return json({ error: "AI copy not configured" }, 503);

  let body: { keywords?: string; genre?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const keywords = String(body.keywords ?? "").trim().slice(0, MAX_KEYWORDS);
  const genre = String(body.genre ?? "").trim().slice(0, 64);
  if (keywords.length < 3) return json({ error: "keywords required" }, 400);

  const system = `You are an elite music marketing copywriter for premium sample packs sold on VYBZ.
Return ONLY valid JSON with keys: title (string, punchy, max 60 chars), description (string, 2-3 sentences, high-converting, no hype spam), features (array of exactly 3 short bullet strings).
No markdown, no prose outside JSON. Professional music-industry tone.`;

  const user = `Keywords: ${keywords}${genre ? `\nGenre: ${genre}` : ""}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("groq", res.status, t);
      return json({ error: "AI copy failed" }, 502);
    }

    const payload = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as {
      title?: string;
      description?: string;
      features?: unknown;
    };

    const features = Array.isArray(parsed.features)
      ? parsed.features.map((f) => String(f).slice(0, 120)).filter(Boolean).slice(0, 5)
      : [];

    return json({
      title: String(parsed.title ?? "").slice(0, 80) || keywords.slice(0, 60),
      description: String(parsed.description ?? "").slice(0, 1200),
      features: features.length ? features : [
        "Royalty-free for music releases",
        "Ready for modern DAWs",
        "Curated for producers",
      ],
    });
  } catch (e) {
    console.error("storefront-pack-copy", (e as Error).message);
    return json({ error: "AI copy failed" }, 502);
  }
});
