// Supabase Edge Function: visual-generate
// Authenticated POST { prompt, stylePreset?, aspect? }
// Debits Vc, calls fal Flux, uploads still to media-public/{uid}/visuals/.
// Deploy with JWT verification ON (default). Secret: FAL_KEY.

import { admin, CORS, callerId, json } from "../_shared/edge.ts";

const COST_VC = 2;
const DAILY_CAP = 10;
const MAX_PROMPT = 480;

const STYLE_SUFFIX: Record<string, string> = {
  glass:
    "frosted glass music interface, soft luminous cyan blue atmosphere, translucent panels, elegant abstract, no text, no watermark, cinematic still",
  aurora:
    "aurora borealis waves over dark stage, soft neon mint and cyan light ribbons, abstract music visual, no text, no faces",
  waveform:
    "abstract audio waveform field, glowing frequency bars, dark ink background, cyan and mint neon, no text, no watermark",
  stage:
    "dark concert stage haze, volumetric light beams, soft bokeh, music festival atmosphere, no people, no text",
  ember:
    "warm ember and coral light gradients, liquid glass refraction, abstract music mood board, no text, no watermark",
};

const BLOCK = [
  /\b(nsfw|nude|naked|porn|sexual|gore|blood|kill|terror|hate)\b/i,
  /\b(child|minor|underage|loli)\b/i,
];

function sha8(s: string): string {
  // Lightweight non-crypto hash for ledger meta (Edge has SubtleCrypto but keep sync).
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function falSize(aspect?: string): string {
  if (aspect === "1:1") return "square_hd";
  if (aspect === "9:16") return "portrait_16_9";
  return "landscape_16_9";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const falKey = Deno.env.get("FAL_KEY") ?? "";
  if (!falKey) return json({ error: "fal_not_configured", hint: "Set FAL_KEY on Edge secrets" }, 503);

  let body: { prompt?: string; stylePreset?: string; aspect?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const promptRaw = (body.prompt ?? "").trim().replace(/\s+/g, " ");
  if (promptRaw.length < 3) return json({ error: "prompt_too_short" }, 400);
  if (promptRaw.length > MAX_PROMPT) return json({ error: "prompt_too_long" }, 400);
  for (const re of BLOCK) {
    if (re.test(promptRaw)) return json({ error: "prompt_blocked" }, 400);
  }

  const styleKey = (body.stylePreset ?? "glass").toLowerCase();
  const suffix = STYLE_SUFFIX[styleKey] ?? STYLE_SUFFIX.glass;
  const fullPrompt = `${promptRaw}. ${suffix}. High quality, 16:9 friendly composition.`;

  const spend = await admin.rpc("vc_spend_visual_generate", {
    p_user_id: uid,
    p_style: styleKey,
    p_prompt_hash: sha8(fullPrompt),
    p_cost: COST_VC,
    p_daily_cap: DAILY_CAP,
  });
  if (spend.error) {
    console.error("vc_spend_visual_generate", spend.error);
    return json({ error: "spend_failed", detail: spend.error.message }, 500);
  }
  const spent = spend.data as {
    ok?: boolean;
    error?: string;
    credits?: number;
    remaining_today?: number;
    event_id?: string;
  } | null;
  if (!spent?.ok) {
    const code = spent?.error || "spend_denied";
    const status = code === "insufficient_vc" ? 402 : code === "daily_cap" ? 429 : 400;
    return json({
      error: code,
      credits: spent?.credits ?? 0,
      remainingToday: spent?.remaining_today ?? 0,
      costVc: COST_VC,
    }, status);
  }

  // fal Flux Dev — sync run
  let imageUrl = "";
  try {
    const falRes = await fetch("https://fal.run/fal-ai/flux/dev", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: falSize(body.aspect),
        num_images: 1,
        enable_safety_checker: true,
      }),
    });
    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error("fal", falRes.status, errText.slice(0, 400));
      return json({
        error: "fal_failed",
        credits: spent.credits,
        remainingToday: spent.remaining_today,
        // Fee already taken; surface refund hint for ops — no auto-refund in v1
        hint: "Generation failed after Vc debit — contact support if this persists",
      }, 502);
    }
    const falJson = await falRes.json() as {
      images?: { url?: string }[];
      image?: { url?: string };
    };
    imageUrl = falJson.images?.[0]?.url || falJson.image?.url || "";
    if (!imageUrl) return json({ error: "fal_empty" }, 502);
  } catch (e) {
    console.error("fal_fetch", e);
    return json({ error: "fal_network" }, 502);
  }

  // Persist into media-public for durable Studio / Compose use
  let publicUrl = imageUrl;
  let storagePath: string | null = null;
  try {
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const ct = imgRes.headers.get("content-type") || "image/jpeg";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      storagePath = `${uid}/visuals/${Date.now()}-${sha8(imageUrl)}.${ext}`;
      const up = await admin.storage.from("media-public").upload(storagePath, bytes, {
        contentType: ct,
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });
      if (!up.error) {
        publicUrl = admin.storage.from("media-public").getPublicUrl(storagePath).data.publicUrl;
        if (spent.event_id) {
          await admin
            .from("visual_generate_events")
            .update({ storage_path: storagePath })
            .eq("id", spent.event_id);
        }
      }
    }
  } catch (e) {
    console.error("persist_still", e);
  }

  return json({
    ok: true,
    imageUrl: publicUrl,
    falUrl: imageUrl,
    storagePath,
    stylePreset: styleKey,
    costVc: COST_VC,
    credits: spent.credits,
    remainingToday: spent.remaining_today,
  });
});
