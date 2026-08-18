import { ATC_POLICY, ATC_UNMEASURED_MINTS, NOT_MEASURED, type AtcLedgerType } from "@/product/invariants";

export function isUnmeasuredMint(type: AtcLedgerType | string): boolean {
  return (ATC_UNMEASURED_MINTS as readonly string[]).includes(type);
}

/** Declared policy amount, or Not measured. Never invents a reception/referral rate. */
export function mintAmountFor(type: AtcLedgerType | string): number | typeof NOT_MEASURED {
  if (isUnmeasuredMint(type)) return NOT_MEASURED;
  if (type === "daily_grant") return ATC_POLICY.dailyFreeGrantAtc;
  if (type === "bootstrap") return ATC_POLICY.newUserStarterAtc;
  return NOT_MEASURED;
}

export function mayMint(type: AtcLedgerType | string): boolean {
  return mintAmountFor(type) !== NOT_MEASURED;
}

export function mayGrantBootstrap(input: {
  accountCreatedAt: number;
  now: number;
  alreadyGranted: boolean;
}): boolean {
  if (input.alreadyGranted) return false;
  if (!Number.isFinite(input.accountCreatedAt) || !Number.isFinite(input.now)) return false;
  const windowMs = ATC_POLICY.newUserBootstrapDays * 24 * 60 * 60 * 1000;
  return input.now - input.accountCreatedAt >= 0 && input.now - input.accountCreatedAt <= windowMs;
}
