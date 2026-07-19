// Supabase Edge Function: stripe-tip
//
// Creates a Stripe Checkout Session for a tip from the signed-in supporter to a
// creator, as a DESTINATION CHARGE — funds settle to the creator's connected
// account. A pending `tips` row is recorded; stripe-webhook marks it paid on
// checkout.session.completed. On-mission (§4.1 Lane A): optional, no fees taken.
//
// Deploy with --no-verify-jwt (we verify the caller's JWT ourselves).
import { admin, CORS, json, callerId } from "../_shared/edge.ts";
import { stripe } from "../_shared/stripe.ts";

const MIN_CENTS = 100;      // $1
const MAX_CENTS = 50_000;   // $500

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const toUserId = String(body.toUserId ?? "");
    const amountCents = Math.round(Number(body.amountCents ?? 0));
    const message = body.message ? String(body.message).slice(0, 200) : null;
    const origin = typeof body.origin === "string" && body.origin.startsWith("http")
      ? body.origin
      : (Deno.env.get("APP_URL") ?? "https://vybz.cloud");

    if (!toUserId || toUserId === uid) return json({ error: "invalid recipient" }, 400);
    if (!(amountCents >= MIN_CENTS && amountCents <= MAX_CENTS)) return json({ error: "Tip must be between $1 and $500." }, 400);

    // Optional platform fee in basis points (default 0 — behavior unchanged until set).
    const feeBps = Math.max(0, Math.min(1000, Number(Deno.env.get("STRIPE_TIP_FEE_BPS") ?? "0") || 0));
    const feeCents = feeBps > 0 ? Math.floor((amountCents * feeBps) / 10_000) : 0;

    const { data: rec } = await admin
      .from("creator_payouts").select("stripe_account_id, charges_enabled").eq("user_id", toUserId).maybeSingle();
    if (!rec?.stripe_account_id || !rec.charges_enabled) return json({ error: "This creator hasn't enabled tips yet." }, 400);

    const { data: prof } = await admin.from("profiles").select("username").eq("id", toUserId).maybeSingle();
    const handle = prof?.username ?? "creator";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: `Tip to @${handle}`, description: "Support this creator on VYBZ" },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        description: `VYBZ tip to @${handle}`,
        transfer_data: { destination: rec.stripe_account_id },
        ...(feeCents > 0 ? { application_fee_amount: feeCents } : {}),
      },
      success_url: `${origin}/u/${toUserId}?tip=success`,
      cancel_url: `${origin}/u/${toUserId}?tip=cancel`,
      metadata: { kind: "tip", from_user: uid, to_user: toUserId },
    });

    await admin.from("tips").insert({
      from_user: uid, to_user: toUserId, amount_cents: amountCents, currency: "usd",
      status: "pending", stripe_session_id: session.id, message,
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error).message ?? "stripe error" }, 400);
  }
});
