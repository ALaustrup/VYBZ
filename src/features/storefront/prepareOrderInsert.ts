/** Pure helper for storefront_orders inserts (platform checkout — no Connect transfer). */

export type SettlementStatus = "pending_manual" | "settled_off_platform";

export interface PrepareOrderInsertInput {
  pack_id: string;
  buyer_email: string;
  buyer_user_id?: string | null;
  amount_cents: number;
  application_fee_cents: number;
  stripe_session_id: string;
  status?: "pending" | "paid" | "failed";
}

export interface PreparedStorefrontOrderInsert {
  pack_id: string;
  buyer_email: string;
  buyer_user_id: string | null;
  amount_cents: number;
  application_fee_cents: number;
  stripe_session_id: string;
  status: "pending" | "paid" | "failed";
  settlement_status: SettlementStatus;
}

/** Builds the row payload for storefront_orders. Never includes transfer_id. */
export function prepareOrderInsert(input: PrepareOrderInsertInput): PreparedStorefrontOrderInsert {
  return {
    pack_id: input.pack_id,
    buyer_email: input.buyer_email,
    buyer_user_id: input.buyer_user_id ?? null,
    amount_cents: input.amount_cents,
    application_fee_cents: input.application_fee_cents,
    stripe_session_id: input.stripe_session_id,
    status: input.status ?? "pending",
    settlement_status: "pending_manual",
  };
}
