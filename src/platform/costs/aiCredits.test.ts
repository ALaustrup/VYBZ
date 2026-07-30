import { beforeEach, describe, expect, it } from "vitest";
import {
  AI_MINUTE_PACK_SECONDS,
  creditAiSeconds,
  debitAICredits,
  getAiCreditBalance,
  listAiCreditLedger,
  resetAiCreditStore,
  secondsToAiMinutes,
} from "./aiCredits";

describe("AI credit ledger", () => {
  beforeEach(() => {
    resetAiCreditStore();
  });

  it("purchase inserts +6000 seconds", async () => {
    const row = await creditAiSeconds(AI_MINUTE_PACK_SECONDS, {
      usd: 10,
      reason: "purchase",
      meta: { pack_id: "minutes_100" },
    });
    expect(row.delta_seconds).toBe(6000);
    expect(await getAiCreditBalance()).toBe(6000);
    const ledger = await listAiCreditLedger();
    expect(ledger[0]?.reason).toBe("purchase");
  });

  it("debit works and reduces balance", async () => {
    await creditAiSeconds(6000);
    await debitAICredits(120, { reason: "ai_mastering" });
    expect(await getAiCreditBalance()).toBe(5880);
  });

  it("hard-stop fires when balance insufficient", async () => {
    await creditAiSeconds(10);
    await expect(debitAICredits(11)).rejects.toThrow(/balance ≤ 0|exhausted/i);
    expect(await getAiCreditBalance()).toBe(10);
  });

  it("secondsToAiMinutes ceils", () => {
    expect(secondsToAiMinutes(1)).toBe(1);
    expect(secondsToAiMinutes(60)).toBe(1);
    expect(secondsToAiMinutes(61)).toBe(2);
  });

  it("lists ledger newest-first after purchase and debit", async () => {
    await creditAiSeconds(6000, { reason: "purchase" });
    await debitAICredits(60, { reason: "ai_mastering" });
    const ledger = await listAiCreditLedger();
    expect(ledger).toHaveLength(2);
    expect(ledger[0]?.delta_seconds).toBe(-60);
    expect(ledger[1]?.delta_seconds).toBe(6000);
  });
});
