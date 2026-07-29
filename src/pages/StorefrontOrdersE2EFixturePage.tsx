import { StorefrontOrdersPanel } from "@/features/storefront/StorefrontOrdersPanel";
import type { StorefrontOrder } from "@/features/storefront/types";

/** Playwright fixture — simulates post–live-checkout Orders UI (platform settlement). */
const FIXTURE_ORDERS: StorefrontOrder[] = [
  {
    id: "e2e-order-1",
    pack_id: "e2e-pack-1",
    buyer_email: "buyer@example.com",
    buyer_user_id: null,
    amount_cents: 100,
    application_fee_cents: 10,
    stripe_session_id: "cs_live_e2e",
    stripe_payment_intent: "pi_live_e2e",
    status: "paid",
    settlement_status: "pending_manual",
    fulfilled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export function StorefrontOrdersE2EFixturePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8" data-testid="storefront-orders-fixture">
      <h1 className="text-xl font-semibold text-white">Orders (e2e fixture)</h1>
      <StorefrontOrdersPanel orders={FIXTURE_ORDERS} />
    </main>
  );
}
