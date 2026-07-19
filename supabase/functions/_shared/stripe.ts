// Shared Stripe client for VYBZ edge functions (Deno). Uses the fetch HTTP client
// + SubtleCrypto provider so it runs on the edge runtime. Secret key is server-
// side only (STRIPE_SECRET_KEY).
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();
