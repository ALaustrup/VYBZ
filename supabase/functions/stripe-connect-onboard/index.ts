// Supabase Edge Function: stripe-connect-onboard
//
// Creates (once) a Stripe Connect Express account for the signed-in creator and
// returns a Stripe-hosted onboarding link. On completing onboarding, Stripe fires
// `account.updated` → stripe-webhook flips creator_payouts.charges_enabled.
//
// Deploy with --no-verify-jwt (we verify the caller's JWT ourselves).
import { admin, CORS, json, callerId } from "../_shared/edge.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const origin = typeof body.origin === "string" && body.origin.startsWith("http")
      ? body.origin
      : (Deno.env.get("APP_URL") ?? "https://vybz.cloud");

    const { data: row } = await admin
      .from("creator_payouts").select("stripe_account_id").eq("user_id", uid).maybeSingle();

    let accountId = row?.stripe_account_id as string | undefined;

    // Refresh mode: re-fetch the account from Stripe and sync readiness flags.
    // Used when the creator returns from Stripe onboarding (return_url), so we
    // don't depend on a separate Connect webhook secret.
    if (body.refresh === true) {
      if (!accountId) return json({ hasAccount: false, chargesEnabled: false, detailsSubmitted: false });
      const acct = await stripe.accounts.retrieve(accountId);
      await admin.from("creator_payouts").update({
        charges_enabled: !!acct.charges_enabled,
        details_submitted: !!acct.details_submitted,
        payouts_enabled: !!acct.payouts_enabled,
        updated_at: new Date().toISOString(),
      }).eq("user_id", uid);
      return json({ hasAccount: true, chargesEnabled: !!acct.charges_enabled, detailsSubmitted: !!acct.details_submitted });
    }
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        capabilities: { transfers: { requested: true } },
        metadata: { user_id: uid },
      });
      accountId = acct.id;
      await admin.from("creator_payouts").upsert(
        { user_id: uid, stripe_account_id: accountId, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/profile?payouts=refresh`,
      return_url: `${origin}/profile?payouts=done`,
      type: "account_onboarding",
    });
    return json({ url: link.url });
  } catch (e) {
    return json({ error: (e as Error).message ?? "stripe error" }, 400);
  }
});
