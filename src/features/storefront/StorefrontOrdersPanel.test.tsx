import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StorefrontOrdersPanel } from "./StorefrontOrdersPanel";
import type { StorefrontOrder } from "./types";

const base: StorefrontOrder = {
  id: "ord-1",
  pack_id: "pack-1",
  buyer_email: "a@b.co",
  buyer_user_id: null,
  amount_cents: 999,
  application_fee_cents: 99,
  stripe_session_id: "cs_x",
  stripe_payment_intent: "pi_x",
  status: "paid",
  settlement_status: "pending_manual",
  fulfilled_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

describe("StorefrontOrdersPanel", () => {
  it("shows Pending manual and Settle now for paid pending rows", () => {
    render(<StorefrontOrdersPanel orders={[base]} onSettle={() => {}} />);
    expect(screen.getByTestId("settlement-pending")).toHaveTextContent("Pending manual");
    expect(screen.getByTestId("settle-now")).toBeInTheDocument();
  });
});
