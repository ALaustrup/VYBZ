// Supabase Edge Function: companion-chat — the "Never Alone" AI companions.
//
// A user sends one message to a platform-owned, clearly-labelled AI persona.
// This function:
//   1. Authenticates the caller (their Supabase JWT).
//   2. Loads the companion persona + the caller's profile context (sanitized).
//   3. Runs the same crisis/severe safety filters as room-mod; on distress it
//      replies supportively and signals the client to surface a Lifeline + 988.
//   4. Enforces a free daily allowance (Godmode = unlimited).
//   5. Calls an LLM (multi-provider, graceful fallback) for a warm reply.
//   6. Persists both turns (service role) so the conversation has continuity.
//
// Deploy with --verify-jwt (the platform validates the caller's session).
// Secrets: OPENAI_API_KEY / OPENROUTER_API_KEY / XAI_API_KEY (any one works).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";

// Free users: messages per rolling 24h. Godmode is unlimited.
const FREE_DAILY = Number(Deno.env.get("COMPANION_FREE_DAILY") ?? "40");
const HISTORY_TURNS = 12;
// Phase 3 — companion memory (RAG). Embeddings are OpenAI-only; when no key is
// set the companion still works, just without long-term recall.
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const EMBED_MODEL = "text-embedding-3-small";
const RECALL_K = 4;

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

const CRISIS = [
  /\bkill(ing)?\s+(myself|me)\b/i,
  /\bsuicid/i,
  /\bwant(ing)?\s+to\s+die\b/i,
  /\bend(ing)?\s+(it all|my life|myself)\b/i,
  /\bself[-\s]?harm/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
];
const SEVERE = [
  /\bchild\s*p(orn)?\b/i,
  /\bcp\b/i,
  /\b(rape|raping)\b/i,
];

const CRISIS_REPLY =
  "I'm really glad you told me, and I want you to be safe. What you're feeling is heavy, " +
  "and you don't have to carry it alone. If you're in danger or thinking about hurting yourself, " +
  "please reach a real person now: call or text 988 (US) or find a helpline at findahelpline.com. " +
  "I'm right here too — want to talk about what's going on?";

const SEVERE_REPLY =
  "I can't help with that, and I won't pretend to. Let's keep this a safe space — " +
  "I'm here if you want to talk about something else.";

interface Persona {
  id: string;
  name: string;
  persona: string;
  nsfw: boolean;
  min_age: number;
  active: boolean;
}

interface LLMMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

async function llmReply(messages: LLMMsg[], teen: boolean): Promise<string | null> {
  interface Provider {
    key: string | undefined;
    url: string;
    model?: string;
    models?: string[];
    headers?: Record<string, string>;
  }
  // OpenRouter is preferred (cost) until a monetization strategy funds OpenAI;
  // OpenAI/xAI remain as automatic fallbacks if OpenRouter is rate-limited.
  const providers: Provider[] = [
    {
      key: Deno.env.get("OPENROUTER_API_KEY"),
      url: "https://openrouter.ai/api/v1/chat/completions",
      models: [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "google/gemini-2.0-flash-exp:free",
        "mistralai/mistral-small-3.2-24b-instruct:free",
      ],
      headers: { "X-Title": "MYVYB", "HTTP-Referer": "https://myvyb.astramatrix.com" },
    },
    {
      key: Deno.env.get("OPENAI_API_KEY"),
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    },
    { key: Deno.env.get("XAI_API_KEY"), url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  ];
  for (const p of providers) {
    if (!p.key) continue;
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json", ...(p.headers ?? {}) },
        body: JSON.stringify({
          ...(p.models ? { models: p.models } : { model: p.model }),
          temperature: teen ? 0.7 : 0.85,
          max_tokens: 220,
          messages,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const out = (data?.choices?.[0]?.message?.content ?? "").trim();
      if (out) return out.slice(0, 1200);
    } catch (_e) {
      // try next provider
    }
  }
  return null;
}

async function embedText(text: string): Promise<number[] | null> {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 6000) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const vec = data?.data?.[0]?.embedding;
    return Array.isArray(vec) ? vec : null;
  } catch {
    return null;
  }
}

function buildSystem(p: Persona, ctx: string, teen: boolean): string {
  const base =
    `You are "${p.name}", an AI companion inside MYVYB, a social app. ${p.persona} ` +
    "Always be warm, real, and concise (usually 1-3 short sentences). Ask a genuine follow-up " +
    "question often so the conversation keeps flowing. " +
    "You are an AI and must never claim to be a human or to have a physical body or real-world life. " +
    "Do not give medical, legal, or financial advice — gently suggest a professional instead. " +
    "Encourage real human connection on MYVYB (live streams, rooms, random chat) when it fits naturally. " +
    "If the user is in crisis, be supportive and point them to 988 (US) / findahelpline.com.";
  const teenRules = teen
    ? " The user is a minor: keep everything strictly age-appropriate, never romantic or sexual, " +
      "and be extra caring and protective."
    : "";
  const context = ctx ? ` Helpful context about the user (use lightly, don't recite it): ${ctx}` : "";
  return base + teenRules + context;
}

function profileContext(profile: Record<string, unknown>): string {
  const bits: string[] = [];
  const username = (profile.username as string) ?? "";
  if (username) bits.push(`They go by "${username}"`);
  const data = (profile.profile ?? {}) as Record<string, unknown>;
  const interests = data.interests;
  if (Array.isArray(interests) && interests.length) {
    bits.push(`interests: ${interests.slice(0, 8).map(String).join(", ")}`);
  }
  const vibe = (data.vibe ?? data.bio ?? data.headline) as string | undefined;
  if (vibe && typeof vibe === "string") bits.push(`vibe: ${vibe.slice(0, 160)}`);
  return bits.join("; ").slice(0, 500);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Authenticate the caller from their JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (userErr || !uid) return json({ error: "unauthorized" }, 401);

  let payload: { companion_id?: string; text?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const companionId = (payload.companion_id ?? "").trim();
  const text = (payload.text ?? "").trim().slice(0, 2000);
  if (!companionId || !text) return json({ error: "missing fields" }, 400);

  // Load caller profile.
  const { data: profile } = await admin
    .from("profiles")
    .select("age, nsfw_opt_in, banned, anonymous, username, godmode, profile")
    .eq("id", uid)
    .single();
  if (!profile) return json({ error: "no profile" }, 403);
  if (profile.banned) return json({ error: "banned" }, 403);

  // Load companion + eligibility.
  const { data: companion } = await admin
    .from("companions")
    .select("id, name, persona, nsfw, min_age, active")
    .eq("id", companionId)
    .single();
  const p = companion as Persona | null;
  if (!p || !p.active) return json({ error: "unknown companion" }, 404);
  const age = Number(profile.age ?? 18);
  if (age < p.min_age) return json({ error: "not eligible" }, 403);
  if (p.nsfw && !(age >= 18 && profile.nsfw_opt_in)) return json({ error: "not eligible" }, 403);
  const teen = age < 18;

  // Always store the user's turn first (so history + rate limit are honest).
  await admin.from("companion_messages").insert({
    user_id: uid,
    companion_id: p.id,
    role: "user",
    content: text,
  });

  // Severe content: refuse, store, return.
  if (SEVERE.some((re) => re.test(text))) {
    await admin.from("companion_messages").insert({
      user_id: uid, companion_id: p.id, role: "assistant", content: SEVERE_REPLY,
    });
    return json({ reply: SEVERE_REPLY });
  }

  // Crisis: supportive reply + Lifeline handoff signal.
  if (CRISIS.some((re) => re.test(text))) {
    await admin.from("companion_messages").insert({
      user_id: uid, companion_id: p.id, role: "assistant", content: CRISIS_REPLY,
    });
    return json({ reply: CRISIS_REPLY, handoff: "lifeline" });
  }

  // Rate limit (free users only).
  if (!profile.godmode) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin
      .from("companion_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("role", "user")
      .gte("created_at", since);
    if ((count ?? 0) > FREE_DAILY) {
      return json({ limited: true, reply: null });
    }
  }

  // Recent history for continuity.
  const { data: hist } = await admin
    .from("companion_messages")
    .select("role, content")
    .eq("user_id", uid)
    .eq("companion_id", p.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);
  const history = ((hist ?? []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Companion memory (RAG): embed this turn, recall the most relevant things the
  // user has shared with this companion before, and weave them into the prompt.
  const qvec = await embedText(text);
  let recallBlock = "";
  if (qvec) {
    const { data: mem } = await admin.rpc("companion_recall", {
      p_user: uid,
      p_companion: p.id,
      p_embedding: `[${qvec.join(",")}]`,
      p_limit: RECALL_K,
    });
    const lines = ((mem ?? []) as { role: string; content: string }[])
      .filter((m) => m.role === "user")
      .map((m) => `- ${m.content.slice(0, 200)}`);
    if (lines.length) {
      recallBlock =
        ` Things the user has shared with you before (use naturally for continuity, ` +
        `do not list them back): \n${lines.join("\n")}`;
    }
  }

  const system = buildSystem(p, profileContext(profile), teen) + recallBlock;
  const messages: LLMMsg[] = [{ role: "system", content: system }, ...history];

  let reply = await llmReply(messages, teen);
  if (!reply) {
    reply =
      "I'm here with you. (My brain's a little slow this second — say that again?) " +
      "What's on your mind?";
  }

  await admin.from("companion_messages").insert({
    user_id: uid, companion_id: p.id, role: "assistant", content: reply,
  });

  // Persist the user's turn as a recallable memory (fire-and-forget).
  if (qvec) {
    await admin
      .from("companion_memory")
      .insert({ user_id: uid, companion_id: p.id, role: "user", content: text, embedding: qvec })
      .then(() => {}, () => {});
  }

  return json({ reply });
});
