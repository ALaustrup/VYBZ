// Supabase Edge Function: ai-topup
//
// Creates a Stripe Checkout Session for AI minute packs (prepaid mastering
// seconds). Platform charge (no Connect). Pending `ai_topups` row; stripe-webhook
// fulfills via fulfill_ai_topup on checkout.session.completed (kind=ai_topup).
//
// Deploy with --no-verify-jwt (verify caller JWT ourselves).
import { admin, CORS, json, callerId } from "../_shared/edge.ts";
import { stripe } from "../_shared/stripe.ts";

/** Default pack: 100 AI minutes ($10) → 6000 seconds. */
const PACKS: Record<string, { cents: number; seconds: number; label: string }> = {
  minutes_100: {
    cents: 1000,
    seconds: 6000,
    label: "AI minute pack — 100 min",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const packId = String(body.packId ?? "minutes_100");
    const pack = PACKS[packId];
    if (!pack) return json({ error: "Invalid AI minute pack." }, 400);

    const origin = typeof body.origin === "string" && body.origin.startsWith("http")
      ? body.origin
      : (Deno.env.get("APP_URL") ?? "https://vybz.cloud");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: pack.cents,
          product_data: {
            name: `VYBZ ${pack.label}`,
            description:
              "Prepaid AI mastering minutes — digital delivery; no shipping",
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        description: `VYBZ AI minute top-up (${packId})`,
      },
      success_url: `${origin}/settings/credits?topup=success`,
      cancel_url: `${origin}/settings/credits?topup=cancel`,
      metadata: {
        kind: "ai_topup",
        user_id: uid,
        pack_id: packId,
        seconds: String(pack.seconds),
      },
    });

    await admin.from("ai_topups").insert({
      user_id: uid,
      pack_id: packId,
      amount_cents: pack.cents,
      seconds: pack.seconds,
      status: "pending",
      stripe_session_id: session.id,
    });

    return json({ url: session.url, seconds: pack.seconds });
  } catch (e) {
    return json({ error: (e as Error).message ?? "stripe error" }, 400);
  }
});
