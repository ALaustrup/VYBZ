// Supabase Edge Function: Veiled's disclosed moderation agent ("Veiled Guide").
//
// Invoked by a DB trigger whenever a USER posts in a room. It:
//   1. Runs cheap, reliable keyword moderation (crisis + severe-abuse). Severe
//      violations are hidden; crisis messages get a supportive reply.
//   2. Occasionally posts a helpful tip or a short, friendly reply — at will —
//      using an LLM when available, otherwise a canned tip.
//
// All of its messages carry sender_kind='mod' so the UI shows a transparent
// <MOD> badge. It is never disguised as a regular user.
//
// Uses only `fetch` against PostgREST (no module imports) to keep cold starts
// fast and reliable. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by
// the platform.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const MOD_ALIAS = "Veiled Guide";

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
  /\bkill\s+(you|him|her|them)\b/i,
  /\bi('?| wi)ll\s+(find|hurt|rape|murder)\b/i,
  /\b(rape|raping)\b/i,
  /\bchild\s*p(orn)?\b/i,
  /\bcp\b/i,
];

const TIPS = [
  "Reminder: you can report any message or block anyone from the message menu. Reports are reviewed.",
  "Shared photos arrive veiled — tap Unveil to reveal them together, or Veil to re-shroud.",
  "Keep it anonymous: avoid sharing personal contact info you wouldn't want public.",
  "Be excellent to each other. Harassment and hate get people banned.",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function postMod(roomId: string, body: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/room_messages`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      room_id: roomId,
      sender_id: null,
      sender_kind: "mod",
      alias: MOD_ALIAS,
      aura: "veil",
      body,
    }),
  });
}

async function hideMessage(id: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/room_messages?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ hidden: true }),
  });
}

async function llmReply(message: string): Promise<string | null> {
  interface Provider {
    key: string | undefined;
    url: string;
    model?: string;
    models?: string[];
    headers?: Record<string, string>;
  }
  const providers: Provider[] = [
    {
      key: Deno.env.get("OPENROUTER_API_KEY"),
      url: "https://openrouter.ai/api/v1/chat/completions",
      models: [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
      ],
      headers: { "X-Title": "Veiled", "HTTP-Referer": "https://getveiled.vercel.app" },
    },
    { key: Deno.env.get("OPENAI_API_KEY"), url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
    { key: Deno.env.get("XAI_API_KEY"), url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  ];
  const system =
    "You are 'Veiled Guide', a friendly, transparent moderation bot in an anonymous chat app called Veiled. " +
    "Reply in ONE short, warm sentence (max 20 words). Be supportive and human, never preachy. " +
    "You may gently welcome people, add levity, or nudge toward kindness. Never pretend to be a human user.";
  for (const p of providers) {
    if (!p.key) continue;
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json", ...(p.headers ?? {}) },
        body: JSON.stringify({
          ...(p.models ? { models: p.models } : { model: p.model }),
          temperature: 0.8,
          max_tokens: 40,
          messages: [
            { role: "system", content: system },
            { role: "user", content: message.slice(0, 500) },
          ],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const out = (data?.choices?.[0]?.message?.content ?? "").trim();
      if (out) return out.slice(0, 200);
    } catch (_e) {
      // try next provider
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("MOD_SECRET");
  if (secret && req.headers.get("x-mod-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: {
    message_id?: string;
    room_id?: string;
    body?: string;
    sender_kind?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const { message_id, room_id, body, sender_kind } = payload;
  if (sender_kind && sender_kind !== "user") return json({ skipped: "non-user" });
  if (!room_id) return json({ skipped: "no room" });

  const text = (body ?? "").trim();

  if (text && SEVERE.some((re) => re.test(text))) {
    if (message_id) await hideMessage(message_id);
    await postMod(
      room_id,
      "A message was removed for violating our Community Guidelines. Threats and illegal content are not tolerated and may be reported."
    );
    return json({ action: "hidden" });
  }

  if (text && CRISIS.some((re) => re.test(text))) {
    await postMod(
      room_id,
      "It sounds like things are heavy right now, and you're not alone. If you're in crisis, call or text 988 (US) or find a helpline at findahelpline.com."
    );
    return json({ action: "crisis-support" });
  }

  const roll = Math.random();
  if (roll < 0.12 && text) {
    const reply = (await llmReply(text)) ?? TIPS[Math.floor(Math.random() * TIPS.length)];
    await postMod(room_id, reply);
    return json({ action: "reply" });
  }
  if (roll >= 0.96) {
    await postMod(room_id, TIPS[Math.floor(Math.random() * TIPS.length)]);
    return json({ action: "tip" });
  }

  return json({ action: "none" });
});
