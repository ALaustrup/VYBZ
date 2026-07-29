import type { SuiteProductId } from "@/design/tokens";

/** Phase 1 stub — expand when billing / org gates land. */
export type EntitlementFlags = {
  products: Partial<Record<SuiteProductId, boolean>>;
};

export function defaultEntitlements(): EntitlementFlags {
  return { products: {} };
}

/** Phase 1: all Suite products accessible. */
export function canAccessProduct(
  _product: SuiteProductId,
  _entitlements: EntitlementFlags = defaultEntitlements(),
): boolean {
  return true;
}
