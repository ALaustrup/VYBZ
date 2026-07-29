// Supabase Edge Function: storefront-checkout
// POST { packId, origin? } — creates Stripe Checkout on the **platform** account
// (no Connect transfer_data). Producer settlement is manual (ACH / Zelle / Vc).
// Guest-friendly: deploy with --no-verify-jwt; optional buyer JWT attaches buyer_user_id.

import { admin, CORS, callerId, json } from "../_shared/edge.ts";
import { stripe } from "../_shared/stripe.ts";

const FEE_BPS = 1000; // 10% platform fee (tracked in DB; not Stripe application_fee)

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const packId = String(body.packId ?? "");
    const origin = typeof body.origin === "string" && body.origin.startsWith("http")
      ? body.origin
      : (Deno.env.get("APP_URL") ?? "https://vybz.cloud");

    if (!packId) return json({ error: "packId required" }, 400);

    const { data: pack, error: packErr } = await admin
      .from("storefront_packs")
      .select("id, user_id, title, slug, price_cents, currency, status, zip_path")
      .eq("id", packId)
      .maybeSingle();

    if (packErr || !pack) return json({ error: "Pack not found" }, 404);
    if (pack.status !== "published") return json({ error: "Pack is not published" }, 400);
    if (!pack.zip_path) return json({ error: "Pack file missing" }, 400);

    const amountCents = Number(pack.price_cents);
    if (!(amountCents >= 100 && amountCents <= 500_000)) {
      return json({ error: "Invalid pack price" }, 400);
    }

    const feeCents = Math.floor((amountCents * FEE_BPS) / 10_000);
    const buyerId = await callerId(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: (pack.currency || "usd").toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: String(pack.title || "Sample Pack"),
            description: "VYBZ Sample Pack — instant download after purchase",
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        description: `VYBZ pack ${pack.slug}`,
      },
      success_url: `${origin}/pack/${pack.slug}?checkout=success`,
      cancel_url: `${origin}/pack/${pack.slug}?checkout=cancel`,
      metadata: {
        kind: "storefront",
        pack_id: pack.id,
        seller_id: pack.user_id,
        settlement: "pending_manual",
        ...(buyerId ? { buyer_user_id: buyerId } : {}),
      },
    });

    const { error: ordErr } = await admin.from("storefront_orders").insert({
      pack_id: pack.id,
      buyer_email: "pending@checkout",
      buyer_user_id: buyerId,
      amount_cents: amountCents,
      application_fee_cents: feeCents,
      status: "pending",
      settlement_status: "pending_manual",
      stripe_session_id: session.id,
    });
    if (ordErr) {
      console.error("storefront_orders insert", ordErr.message);
      return json({ error: "Could not create order" }, 500);
    }

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error).message ?? "stripe error" }, 400);
  }
});
