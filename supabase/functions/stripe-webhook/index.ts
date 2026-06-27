// Supabase Edge Function: Stripe webhook → grant Godmode server-side.
//
// This is the authoritative entitlement check. The client only ever optimistically
// shows Godmode after the redirect; the truth lives in profiles.godmode, set here
// after Stripe confirms a completed payment with a verified signature.
//
// Setup:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set \
//     STRIPE_SECRET_KEY=sk_live_... \
//     STRIPE_WEBHOOK_SECRET=whsec_... \
//     SERVICE_ROLE_KEY=<service_role key>   # SUPABASE_URL is provided by the platform
//
// Then in the Stripe dashboard add a webhook endpoint pointing at this function's
// URL, subscribed to `checkout.session.completed`. The Payment Link must carry
// the buyer's Veiled account id as `client_reference_id` (the app appends it).

import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    return new Response(`Invalid signature: ${(err as Error).message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const paid = session.payment_status === "paid";
    if (userId && paid) {
      const { error } = await supabase
        .from("profiles")
        .update({ godmode: true })
        .eq("id", userId);
      if (error) {
        return new Response(`DB update failed: ${error.message}`, {
          status: 500,
        });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
