// Pricing model.
//
// The in-app V¢ currency has been retired: every item is now free to use.
// Godmode (a one-time real-money purchase) is the only paid upgrade and is
// gated separately as a membership — it no longer changes item prices.

export const GODMODE_DISCOUNT = 0;

/** Every item is free now, so the price is always 0. */
export function priceFor(_base: number, _godmode: boolean): number {
  return 0;
}

/** Retained for back-compat; no longer surfaced in the UI. */
export const GODMODE_DISCOUNT_LABEL = "Godmode";
