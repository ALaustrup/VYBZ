// Supabase Edge Function: stripe-credit-topup
//
// Creates a Stripe Checkout Session for cosmetic-store credit packs. Charges
// the VYBZ platform account (no Connect). A pending `credit_topups` row is
// recorded; stripe-webhook fulfills via fulfill_credit_topup on
// checkout.session.completed.
//
// Deploy with --no-verify-jwt (we verify the caller's JWT ourselves).
import { admin, CORS, json, callerId } from "../_shared/edge.ts";
import { stripe } from "../_shared/stripe.ts";

const PACKS: Record<string, { cents: number; credits: number; label: string }> = {
  starter: { cents: 500, credits: 50, label: "Starter — 50 credits" },
  plus: { cents: 1000, credits: 120, label: "Plus — 120 credits" },
  pro: { cents: 2500, credits: 350, label: "Pro — 350 credits" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const packId = String(body.packId ?? "");
    const pack = PACKS[packId];
    if (!pack) return json({ error: "Invalid credit pack." }, 400);

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
            description: "Cosmetic-store credits — optional, never gates collaboration",
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        description: `VYBZ credit top-up (${packId})`,
      },
      success_url: `${origin}/store?topup=success`,
      cancel_url: `${origin}/store?topup=cancel`,
      metadata: {
        kind: "credit_topup",
        user_id: uid,
        pack_id: packId,
        credits: String(pack.credits),
      },
    });

    await admin.from("credit_topups").insert({
      user_id: uid,
      pack_id: packId,
      amount_cents: pack.cents,
      credits: pack.credits,
      status: "pending",
      stripe_session_id: session.id,
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error).message ?? "stripe error" }, 400);
  }
});
