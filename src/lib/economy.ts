// V¢ pricing model.
//
// Design principle: Godmode never makes purchasables *free* (that would gut the
// V¢ economy and kill engagement). Instead Godmode grants:
//   1. a standing **discount** on anything purchasable, and
//   2. access to a few **exclusive** items that aren't for sale at all.
// Everything else is buyable by everyone with earned V¢.

export const GODMODE_DISCOUNT = 0.3; // 30% off for Godmode members.

/** The V¢ price of a `base`-priced item for this user (Godmode = discounted). */
export function priceFor(base: number, godmode: boolean): number {
  if (base <= 0) return 0;
  return godmode ? Math.max(1, Math.round(base * (1 - GODMODE_DISCOUNT))) : base;
}

/** Human label for the discount, e.g. "Godmode −30%". */
export const GODMODE_DISCOUNT_LABEL = `Godmode −${Math.round(GODMODE_DISCOUNT * 100)}%`;
