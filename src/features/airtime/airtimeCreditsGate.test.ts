/**
 * Airtime Credits gate — hosting commons (decision 0005).
 *
 * Listening is free. Hosting burns ATC. The ledger is server-only.
 * Station Airtime stays parked and separate.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AIRTIME_CREDITS,
  ATC_CREATION_TYPES,
  ATC_DESTRUCTION_TYPES,
  ATC_POLICY,
  ATC_UNMEASURED_MINTS,
  CURRENCY,
  GATE_REGISTRY,
  LIVE_MIX_STREAMING,
} from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("airtime credits", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("airtimeCredits");
  });

  it("keeps the closed loop and never lets money become the right to host", () => {
    expect(AIRTIME_CREDITS.listeningIsAlwaysFree).toBe(true);
    expect(AIRTIME_CREDITS.hostingRequiresAtc).toBe(true);
    expect(AIRTIME_CREDITS.atcIsPurchasable).toBe(false);
    expect(AIRTIME_CREDITS.moneyConvertsToAtc).toBe(false);
    expect(AIRTIME_CREDITS.atcConvertsToMoney).toBe(false);
    expect(AIRTIME_CREDITS.atcIsTransferable).toBe(false);
    expect(AIRTIME_CREDITS.atcIsGiftable).toBe(false);
    expect(AIRTIME_CREDITS.serverAuthoritativeLedgerOnly).toBe(true);
    expect(AIRTIME_CREDITS.dailyFreeDoesNotStack).toBe(true);
    expect(AIRTIME_CREDITS.consumeDailyFreeFirst).toBe(true);
    expect(AIRTIME_CREDITS.refuseUnmeasuredMint).toBe(true);
    expect(ATC_UNMEASURED_MINTS).toEqual(["reception_bonus", "referral"]);
    expect(LIVE_MIX_STREAMING.hostingRequiresAtc).toBe(true);
    expect(CURRENCY.vcConvertsToAirtime).toBe(false);
    expect(CURRENCY.airtimeConvertsToVc).toBe(false);
  });

  it("declares the policy numbers rather than inventing measurements", () => {
    expect(ATC_POLICY.dailyFreeGrantAtc).toBe(7200);
    expect(ATC_POLICY.baseAtcPerVerifiedMinute).toBe(50);
    expect(ATC_POLICY.hostStartMinimumAtc).toBe(300);
    expect(ATC_POLICY.hostWarningRemainingAtc).toBe(60);
    expect(ATC_POLICY.maxQualityMultiplier).toBe(1.8);
    expect(ATC_CREATION_TYPES).toEqual([
      "daily_grant",
      "listen_earn",
      "reception_bonus",
      "referral",
      "bootstrap",
      "admin_adjust",
    ]);
    expect(ATC_DESTRUCTION_TYPES).toEqual(["host_consume", "admin_adjust"]);
  });

  it("rewrites PRODUCT so hosting is no longer described as free", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Version 6");
    expect(product).toContain("Listening is always free");
    expect(product).toContain("Hosting burns Airtime Credits");
    expect(product).not.toMatch(/Going live and hosting sessions is free/);
    expect(product).toContain("Station Airtime stays parked");
    expect(product).toContain("0008");
    expect(product).toContain("Reception bonus and referral do not mint yet");
  });

  it("keeps the ledger off Stripe and off client writes", () => {
    const sql = read("supabase/migrations/20260817_0105_airtime_credits.sql");
    expect(sql).toContain("daily_free_remaining = 7200");
    expect(sql).toContain("'host_consume'");
    expect(sql).toContain("'listen_earn'");
    expect(sql).toContain("No client writes");
    expect(sql).not.toMatch(/stripe/i);
    expect(sql).toContain("grant execute on function public.grant_daily_free");
    expect(sql).toContain("revoke all on function public.grant_daily_free(text) from anon");
  });

  it("awards listen credit only from verified heartbeats, not client flags", () => {
    const sql = read("supabase/migrations/20260817_0105_airtime_credits.sql");
    expect(sql).toContain("report_listen_heartbeat");
    expect(sql).toContain("_atc_award_verified");
    expect(sql).toContain("_atc_quality_for");
    expect(sql).toContain("revoke all on function public.award_listen_credit");
    expect(sql).toContain("can_start_live");
    expect(sql).toContain("if total < 300");
    const start = read("src/lib/api.ts");
    expect(start).toContain("canStartLive");
    const watch = read("src/pages/LiveWatchPage.tsx");
    expect(watch).toContain("useListenEarn");
    expect(watch).toContain("useHostBurn");
    expect(watch).toContain("AtcHostCard");
  });

  it("shows a header meter that never invents a clock", () => {
    const bar = read("src/components/shell/ContextualAppBar.tsx");
    expect(bar).toContain("<AtcMeter");
    const meter = read("src/features/airtime/AtcMeter.tsx");
    expect(meter).toContain("useAtcBalance");
    expect(meter).toContain("formatAtcClock");
    expect(meter).toContain("NOT_MEASURED");
    expect(meter).toContain("atc-meter");
    const hook = read("src/features/airtime/useAtcBalance.ts");
    expect(hook).toContain("fetchAtcBalance");
    expect(hook).not.toMatch(/earnedBalance \+|dailyFreeRemaining \+/);
    const go = read("src/components/GoLiveSheet.tsx");
    expect(go).toContain("AtcHostCard");
    expect(go).toContain("canStartHost");
    expect(go).toContain("go-live-start");
    const card = read("src/features/airtime/AtcHostCard.tsx");
    expect(card).toContain("Daily free");
    expect(card).toContain("Earned");
    expect(card).toContain("NOT_MEASURED");
    const burn = read("src/features/airtime/AtcLiveHooks.ts");
    expect(burn).toContain("planAfterBurn");
    expect(burn).toContain("leftoverPlaySeconds");
  });

  it("refuses reception bonus and referral mints instead of inventing rates", () => {
    const sql = read("supabase/migrations/20260818_0109_atc_unmeasured_mints.sql");
    expect(sql).toContain("rates_not_measured");
    expect(sql).toContain("award_reception_bonus");
    expect(sql).toContain("award_referral");
    expect(sql).toContain("Not measured");
    expect(sql).not.toMatch(/insert into public.airtime_ledger/i);
    expect(sql).not.toMatch(/stripe/i);
    const mint = read("src/features/airtime/atcMint.ts");
    expect(mint).toContain("ATC_UNMEASURED_MINTS");
    expect(mint).toContain("NOT_MEASURED");
    const api = read("src/features/airtime/atcApi.ts");
    expect(api).toContain("requestUnmeasuredMint");
    expect(api).toContain("award_reception_bonus");
  });

  it("grants bootstrap only at the declared 3600 / 7-day rate", () => {
    const sql = read("supabase/migrations/20260818_0110_atc_bootstrap.sql");
    expect(sql).toContain("3600");
    expect(sql).toContain("interval '7 days'");
    expect(sql).toContain("'bootstrap'");
    expect(sql).not.toMatch(/award_reception_bonus|award_referral/);
    expect(sql).not.toMatch(/stripe/i);
    expect(ATC_POLICY.newUserStarterAtc).toBe(3600);
    expect(ATC_POLICY.newUserBootstrapDays).toBe(7);
  });
});
