// Supabase Edge Function: embed — semantic profile vectors (Phase 3).
//
// Computes a single 1536-d embedding that summarizes the caller's profile
// free-text (bio, interests, intent, languages, traits, prompts) and upserts it
// into public.profile_embeddings. The matcher (user_matches) then adds a
// "resonance" term so people who simply vibe semantically surface — not just
// keyword overlap. The OpenAI key stays server-side; the client only triggers a
// refresh (fire-and-forget) after saving their profile.
//
// Deploy with --verify-jwt. Secret: OPENAI_API_KEY (embeddings are OpenAI-only).
// Gracefully no-ops (200, skipped) when no key is set or there's nothing to embed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const EMBED_MODEL = "text-embedding-3-small";

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

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
}

/** Flatten the rich profile jsonb into a single descriptive paragraph. */
function profileText(username: string, profile: Record<string, unknown>): string {
  const parts: string[] = [];
  if (username) parts.push(username);
  const bio = profile.bio;
  if (typeof bio === "string" && bio.trim()) parts.push(bio.trim());
  const pronouns = profile.pronouns;
  if (typeof pronouns === "string" && pronouns.trim()) parts.push(`pronouns: ${pronouns}`);
  const interests = arr(profile.interests);
  if (interests.length) parts.push(`Interests: ${interests.join(", ")}`);
  const lookingFor = arr(profile.lookingFor);
  if (lookingFor.length) parts.push(`Looking for: ${lookingFor.join(", ")}`);
  const languages = arr(profile.languages);
  if (languages.length) parts.push(`Languages: ${languages.join(", ")}`);
  const traits = profile.traits;
  if (traits && typeof traits === "object") {
    const t = Object.entries(traits as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
    if (t) parts.push(`Traits: ${t}`);
  }
  const prompts = profile.prompts;
  if (Array.isArray(prompts)) {
    for (const p of prompts as Record<string, unknown>[]) {
      const q = p?.question ?? p?.prompt;
      const a = p?.answer ?? p?.response;
      if (a) parts.push(`${q ? `${q} ` : ""}${a}`);
    }
  }
  return parts.join(". ").slice(0, 6000);
}

async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const vec = data?.data?.[0]?.embedding;
    return Array.isArray(vec) ? vec : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!OPENAI_KEY) return json({ ok: false, skipped: "no_openai_key" });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (userErr || !uid) return json({ error: "unauthorized" }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("username, profile")
    .eq("id", uid)
    .single();
  if (!profile) return json({ error: "no profile" }, 403);

  const text = profileText(
    (profile.username as string) ?? "",
    (profile.profile ?? {}) as Record<string, unknown>
  );
  if (text.replace(/\s/g, "").length < 8) {
    return json({ ok: false, skipped: "empty_profile" });
  }

  const hash = await sha256(`${EMBED_MODEL}:${text}`);
  const { data: existing } = await admin
    .from("profile_embeddings")
    .select("content_hash")
    .eq("user_id", uid)
    .maybeSingle();
  if (existing?.content_hash === hash) return json({ ok: true, unchanged: true });

  const vec = await embedText(text);
  if (!vec) return json({ ok: false, skipped: "embed_failed" });

  const { error: upErr } = await admin
    .from("profile_embeddings")
    .upsert({ user_id: uid, embedding: vec, content_hash: hash, updated_at: new Date().toISOString() });
  if (upErr) return json({ ok: false, error: upErr.message });

  return json({ ok: true });
});
