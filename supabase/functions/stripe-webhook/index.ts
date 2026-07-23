// Supabase Edge Function: stripe-webhook
//
// Signature-verified Stripe webhook. Handles:
//   • checkout.session.completed (kind=tip) → mark the tip 'paid'
//   • checkout.session.completed (kind=credit_topup) → fulfill_credit_topup
//   • account.updated             → sync creator_payouts readiness flags
//
// Deploy with --no-verify-jwt (Stripe calls this without a Supabase JWT; we
// verify the Stripe-Signature instead).
import { admin } from "../_shared/edge.ts";
import { stripe, cryptoProvider } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const raw = await req.text();
  if (!sig || !secret) return new Response("not configured", { status: 400 });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret, undefined, cryptoProvider);
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as { id: string; payment_intent?: string; metadata?: Record<string, string> };
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : null;
      if (s.metadata?.kind === "tip") {
        await admin.from("tips").update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent: pi,
        }).eq("stripe_session_id", s.id);
      } else if (s.metadata?.kind === "credit_topup") {
        const { error } = await admin.rpc("fulfill_credit_topup", {
          p_session_id: s.id,
          p_payment_intent: pi,
        });
        if (error) console.error("fulfill_credit_topup", error.message);
      }
    } else if (event.type === "account.updated") {
      const a = event.data.object as {
        id: string; charges_enabled: boolean; details_submitted: boolean; payouts_enabled: boolean;
      };
      await admin.from("creator_payouts").update({
        charges_enabled: !!a.charges_enabled,
        details_submitted: !!a.details_submitted,
        payouts_enabled: !!a.payouts_enabled,
        updated_at: new Date().toISOString(),
      }).eq("stripe_account_id", a.id);
    }
  } catch (e) {
    // Log-and-200 for handler errors so Stripe doesn't hammer retries on a bug;
    // signature failures above already returned 400.
    console.error("webhook handler error", (e as Error).message);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
