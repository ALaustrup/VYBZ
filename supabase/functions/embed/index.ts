// Supabase Edge Function: embed — semantic profile vectors for VYBZ resonance.
//
// Computes a 384-d embedding summarizing the caller's creator identity (bio,
// influences, genres, DAWs, plugins, intent, languages, traits, prompts) and
// upserts it into public.profile_embeddings. collab_matches then adds a
// "resonance" term so creators whose sound + intent align surface, beyond mere
// keyword overlap.
//
// Uses Supabase's BUILT-IN Edge inference (Supabase.ai, model `gte-small`) — no
// external provider, no API key, no cost. Deploy with --verify-jwt (default).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Built-in embedding model (384-d). Provided by the Supabase Edge Runtime.
// deno-lint-ignore no-explicit-any
const session = new (globalThis as any).Supabase.ai.Session("gte-small");

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
  const roleLabel = profile.roleLabel ?? profile.role;
  if (typeof roleLabel === "string" && roleLabel.trim()) {
    parts.push(`Role: ${roleLabel.trim()}`);
  }
  const intents = arr(profile.intents);
  if (intents.length) parts.push(`Here for: ${intents.join(", ")}`);
  const bio = profile.bio;
  if (typeof bio === "string" && bio.trim()) parts.push(bio.trim());
  const influences = profile.influences;
  if (typeof influences === "string" && influences.trim()) parts.push(`Influences: ${influences.trim()}`);
  const genres = arr(profile.genres);
  if (genres.length) parts.push(`Genres: ${genres.join(", ")}`);
  const daws = arr(profile.daws);
  if (daws.length) parts.push(`DAWs: ${daws.join(", ")}`);
  const plugins = arr(profile.plugins);
  if (plugins.length) parts.push(`Plugins: ${plugins.join(", ")}`);
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
      const q = p?.question ?? p?.q ?? p?.prompt;
      const a = p?.answer ?? p?.a ?? p?.response;
      if (a) parts.push(`${q ? `${q} ` : ""}${a}`);
    }
  }
  return parts.join(". ").slice(0, 6000);
}

/** Flatten discipline modules into descriptive text for the embedding. */
function modulesText(modules: unknown[]): string {
  const parts: string[] = [];
  for (const raw of modules) {
    const m = raw as Record<string, unknown>;
    const role = m.roles as Record<string, unknown> | null;
    const label = role?.label as string | undefined;
    const category = (role?.categories as Record<string, unknown> | null)?.label as string | undefined;
    const seg: string[] = [];
    if (label) seg.push(category ? `${label} (${category})` : label);
    if (typeof m.headline === "string" && m.headline.trim()) seg.push(m.headline.trim());
    const attrs = (m.attrs ?? {}) as Record<string, unknown>;
    for (const [key, val] of Object.entries(attrs)) {
      if (Array.isArray(val) && val.length) seg.push(`${key}: ${val.map(String).join(", ")}`);
      else if (val && typeof val === "object") seg.push(`${key}: ${Object.keys(val as object).join(", ")}`);
    }
    if (seg.length) parts.push(seg.join(" — "));
  }
  return parts.join(". ");
}

async function embedText(text: string): Promise<number[] | null> {
  try {
    const out = await session.run(text, { mean_pool: true, normalize: true });
    return Array.isArray(out) ? (out as number[]) : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

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

  // Fold the creator's discipline modules (headlines + structured attrs) into
  // the embedding text so semantic resonance spans every discipline they work in.
  const { data: modules } = await admin
    .from("profile_modules")
    .select("headline, attrs, roles(label, categories(label))")
    .eq("user_id", uid)
    .is("archived_at", null);

  const text = [
    profileText((profile.username as string) ?? "", (profile.profile ?? {}) as Record<string, unknown>),
    modulesText((modules ?? []) as unknown[]),
  ].filter(Boolean).join(". ").slice(0, 6000);

  if (text.replace(/\s/g, "").length < 8) {
    return json({ ok: false, skipped: "empty_profile" });
  }

  const hash = await sha256(`gte-small:${text}`);
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

  return json({ ok: true, dims: vec.length });
});
