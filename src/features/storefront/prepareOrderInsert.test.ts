import { describe, expect, it } from "vitest";
import { prepareOrderInsert } from "./prepareOrderInsert";

describe("prepareOrderInsert", () => {
  it("sets settlement_status to pending_manual and omits transfer fields", () => {
    const row = prepareOrderInsert({
      pack_id: "pack-1",
      buyer_email: "buyer@example.com",
      amount_cents: 1000,
      application_fee_cents: 100,
      stripe_session_id: "cs_live_test",
    });

    expect(row.settlement_status).toBe("pending_manual");
    expect(row.status).toBe("pending");
    expect(row).not.toHaveProperty("transfer_id");
    expect(row).not.toHaveProperty("stripe_transfer_id");
    expect(Object.keys(row).sort()).toEqual([
      "amount_cents",
      "application_fee_cents",
      "buyer_email",
      "buyer_user_id",
      "pack_id",
      "settlement_status",
      "status",
      "stripe_session_id",
    ].sort());
  });
});
