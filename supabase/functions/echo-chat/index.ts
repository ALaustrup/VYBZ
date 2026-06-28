// Supabase Edge Function: echo-chat — talk to a real member's opt-in AI Echo.
//
// An Echo is an AI persona a user created and switched on FOR THEMSELVES. A
// visitor can chat with it while that member is away. Hard guarantees enforced
// here (not just the UI):
//   • The Echo must be enabled by its owner; otherwise refuse.
//   • Both parties must be adults (18+) in the same age layer.
//   • Refuse if either has blocked the other.
//   • The persona is built only from the owner's NON-hidden profile data, and
//     is always disclosed as an AI Echo — it must never claim to be the real
//     person, make commitments for them, leak private info, or go explicit.
//   • Same crisis/severe safety as room-mod, with Lifeline + 988 handoff.
//   • Per-visitor daily cap (Godmode unlimited). Both turns are stored so the
//     owner can review every conversation.
//
// Deploy with --verify-jwt. Secrets: OPENAI_API_KEY / OPENROUTER_API_KEY / XAI_API_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const FREE_DAILY = Number(Deno.env.get("ECHO_FREE_DAILY") ?? "30");
const HISTORY_TURNS = 12;

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
const SEVERE = [/\bchild\s*p(orn)?\b/i, /\bcp\b/i, /\b(rape|raping)\b/i];

const CRISIS_REPLY =
  "It sounds really heavy right now, and I want you to be safe. I'm just an AI Echo, " +
  "but please reach a real person: call or text 988 (US) or find a helpline at " +
  "findahelpline.com. You don't have to go through this alone.";
const SEVERE_REPLY =
  "I can't help with that. Let's keep this respectful — I'm an AI Echo here for a friendly chat.";

interface LLMMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

const TONE: Record<string, string> = {
  warm: "warm and friendly",
  playful: "playful and light",
  direct: "direct and genuine",
  thoughtful: "thoughtful and calm",
};

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
}

/** Strip the owner's private (hidden) keys, then summarize what remains. */
function personaFromProfile(profile: Record<string, unknown>): string {
  const hidden = new Set(arr(profile["_hidden"]).concat(arr(profile["hidden"])));
  const get = (k: string) => (hidden.has(k) ? undefined : profile[k]);
  const parts: string[] = [];
  const bio = get("bio");
  if (typeof bio === "string" && bio.trim()) parts.push(`About them: ${bio.trim()}`);
  const interests = arr(get("interests"));
  if (interests.length) parts.push(`Interests: ${interests.join(", ")}`);
  const lookingFor = arr(get("lookingFor"));
  if (lookingFor.length) parts.push(`Here for: ${lookingFor.join(", ")}`);
  const languages = arr(get("languages"));
  if (languages.length) parts.push(`Speaks: ${languages.join(", ")}`);
  const traits = get("traits");
  if (traits && typeof traits === "object") {
    const t = Object.entries(traits as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
    if (t) parts.push(`Style: ${t}`);
  }
  const prompts = get("prompts");
  if (Array.isArray(prompts)) {
    for (const p of prompts as Record<string, unknown>[]) {
      const q = p?.question ?? p?.prompt;
      const a = p?.answer ?? p?.response;
      if (a) parts.push(`${q ? `${q} ` : ""}${a}`);
    }
  }
  return parts.join(". ").slice(0, 2000);
}

function buildSystem(name: string, tone: string, bioSeed: string, persona: string): string {
  const toneText = TONE[tone] ?? TONE.warm;
  let s =
    `You are an AI "Echo" of ${name}, a real MYVYB member who is currently away. ` +
    `${name} created and switched you on themselves; you chat in a way inspired by what they chose to share. ` +
    `Be ${toneText}, real, and concise (usually 1-3 short sentences), and ask a genuine question to keep things flowing. ` +
    "HARD RULES you must always follow: " +
    `(1) You are an AI Echo, not the real ${name}; if asked, say so plainly and never pretend to literally be them. ` +
    `(2) Never speak for ${name}'s real feelings or decisions and never make promises, plans, or commitments on their behalf — ` +
    `instead suggest the visitor message ${name} directly. ` +
    "(3) Never share or invent private or contact info, exact location, or anything not provided below. " +
    "(4) Never be sexual or explicit, even if asked — this protects the real person. " +
    "(5) If the visitor seems in crisis, be supportive and point them to 988 (US) / findahelpline.com.";
  if (bioSeed) s += ` In ${name}'s own words about how you should come across: ${bioSeed.slice(0, 400)}`;
  if (persona) s += ` What ${name} shared (use naturally, don't recite as a list): ${persona}`;
  return s;
}

async function llmReply(messages: LLMMsg[]): Promise<string | null> {
  interface Provider {
    key: string | undefined;
    url: string;
    model?: string;
    models?: string[];
    headers?: Record<string, string>;
  }
  const providers: Provider[] = [
    { key: Deno.env.get("OPENAI_API_KEY"), url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
    {
      key: Deno.env.get("OPENROUTER_API_KEY"),
      url: "https://openrouter.ai/api/v1/chat/completions",
      models: ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3-next-80b-a3b-instruct:free"],
      headers: { "X-Title": "MYVYB", "HTTP-Referer": "https://astramatrix.com" },
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
          temperature: 0.8,
          max_tokens: 200,
          messages,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const out = (data?.choices?.[0]?.message?.content ?? "").trim();
      if (out) return out.slice(0, 1000);
    } catch (_e) {
      // try next provider
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const visitor = userData?.user?.id;
  if (userErr || !visitor) return json({ error: "unauthorized" }, 401);

  let payload: { owner_id?: string; text?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const ownerId = (payload.owner_id ?? "").trim();
  const text = (payload.text ?? "").trim().slice(0, 2000);
  if (!ownerId || !text) return json({ error: "missing fields" }, 400);
  if (ownerId === visitor) return json({ error: "self" }, 400);

  // Visitor must be an adult and not banned.
  const { data: me } = await admin
    .from("profiles")
    .select("age, banned, godmode")
    .eq("id", visitor)
    .single();
  if (!me) return json({ error: "no profile" }, 403);
  if (me.banned) return json({ error: "banned" }, 403);
  if (Number(me.age ?? 0) < 18) return json({ error: "not eligible" }, 403);

  // Echo must be enabled by an adult owner.
  const { data: echo } = await admin
    .from("echoes")
    .select("enabled, display_name, tone, greeting, bio_seed")
    .eq("user_id", ownerId)
    .single();
  if (!echo || !echo.enabled) return json({ error: "echo unavailable" }, 404);

  const { data: owner } = await admin
    .from("profiles")
    .select("age, banned, username, profile")
    .eq("id", ownerId)
    .single();
  if (!owner || owner.banned) return json({ error: "echo unavailable" }, 404);
  if (Number(owner.age ?? 0) < 18) return json({ error: "echo unavailable" }, 404);

  // Mutual block check (either direction).
  const { data: blocked } = await admin
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${visitor},blocked_id.eq.${ownerId}),and(blocker_id.eq.${ownerId},blocked_id.eq.${visitor})`
    )
    .limit(1);
  if (blocked && blocked.length) return json({ error: "unavailable" }, 403);

  // Store the visitor's turn first.
  await admin.from("echo_messages").insert({
    echo_owner: ownerId, visitor_id: visitor, role: "user", content: text,
  });

  if (SEVERE.some((re) => re.test(text))) {
    await admin.from("echo_messages").insert({
      echo_owner: ownerId, visitor_id: visitor, role: "assistant", content: SEVERE_REPLY,
    });
    return json({ reply: SEVERE_REPLY });
  }
  if (CRISIS.some((re) => re.test(text))) {
    await admin.from("echo_messages").insert({
      echo_owner: ownerId, visitor_id: visitor, role: "assistant", content: CRISIS_REPLY,
    });
    return json({ reply: CRISIS_REPLY, handoff: "lifeline" });
  }

  // Per-visitor daily cap (Godmode unlimited).
  if (!me.godmode) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin
      .from("echo_messages")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", visitor)
      .eq("role", "user")
      .gte("created_at", since);
    if ((count ?? 0) > FREE_DAILY) return json({ limited: true, reply: null });
  }

  const name = (echo.display_name as string) || (owner.username as string) || "this member";
  const persona = personaFromProfile((owner.profile ?? {}) as Record<string, unknown>);
  const system = buildSystem(name, (echo.tone as string) ?? "warm", (echo.bio_seed as string) ?? "", persona);

  const { data: hist } = await admin
    .from("echo_messages")
    .select("role, content")
    .eq("echo_owner", ownerId)
    .eq("visitor_id", visitor)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);
  const history = ((hist ?? []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const messages: LLMMsg[] = [{ role: "system", content: system }, ...history];
  let reply = await llmReply(messages);
  if (!reply) {
    reply = `Hey! I'm ${name}'s AI Echo — they're away right now, but I'm happy to chat. What's up?`;
  }

  await admin.from("echo_messages").insert({
    echo_owner: ownerId, visitor_id: visitor, role: "assistant", content: reply,
  });

  return json({ reply });
});
