// Supabase Edge Function: suggest (never enforce) whether an uploaded image is
// NSFW, using OpenAI's free `omni-moderation-latest` model (image input).
//
// Returns { nsfw: boolean }. The client uses this only to attach an "NSFW" badge
// + soft blur that any user can personally Unveil (or globally opt into). False
// positives are harmless because nothing is blocked.
//
// Deploy: supabase functions deploy moderate-image
//         supabase secrets set OPENAI_API_KEY=sk-...

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ nsfw: false });

  let imageUrl: string | undefined;
  try {
    imageUrl = (await req.json()).imageUrl;
  } catch {
    return json({ nsfw: false });
  }
  if (!imageUrl) return json({ nsfw: false });

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: imageUrl } }],
      }),
    });
    if (!res.ok) return json({ nsfw: false });
    const data = await res.json();
    const r = data?.results?.[0] ?? {};
    const cats = r.categories ?? {};
    const scores = r.category_scores ?? {};
    const nsfw =
      Boolean(cats.sexual || cats["sexual/minors"]) ||
      (scores.sexual ?? 0) > 0.5 ||
      (scores["sexual/minors"] ?? 0) > 0.2;
    return json({ nsfw });
  } catch {
    return json({ nsfw: false });
  }
});
