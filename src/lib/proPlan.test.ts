import { describe, expect, it } from "vitest";
import {
  PRO_GRACE_DAYS,
  PRO_PERIOD_DAYS,
  PRO_PRICE_USD,
  PRO_PRICE_VC,
  PRO_STORAGE_GB,
  affords,
  canHostAudio,
  nextPeriodEnd,
  periodCostVc,
  proStatus,
  publishedAudioOutcome,
} from "@/lib/proPlan";
import { VC_USD } from "@/lib/vc";
import type { ProfileDetails } from "@/types";

const NOW = Date.UTC(2026, 7, 5);
const DAY = 24 * 60 * 60 * 1000;

function profile(over: Partial<ProfileDetails> = {}): ProfileDetails {
  return { ...over };
}

function iso(offsetDays: number): string {
  return new Date(NOW + offsetDays * DAY).toISOString();
}

describe("pricing", () => {
  it("prices a period at exactly $3.00 on the V¢ peg", () => {
    expect(PRO_PRICE_VC * VC_USD).toBeCloseTo(3, 10);
    expect(PRO_PRICE_USD).toBeCloseTo(3, 10);
  });

  it("charges only the base fee within the included allowance", () => {
    for (const gb of [0, 1, PRO_STORAGE_GB]) {
      const cost = periodCostVc(gb);
      expect(cost.overageGb).toBe(0);
      expect(cost.total).toBe(PRO_PRICE_VC);
    }
  });

  it("charges whole-gigabyte overage above the allowance", () => {
    const cost = periodCostVc(PRO_STORAGE_GB + 2.2);
    expect(cost.overageGb).toBe(3);
    expect(cost.total).toBe(PRO_PRICE_VC + 3 * 6);
  });

  it("reports the exact shortfall when a balance is short", () => {
    expect(affords(PRO_PRICE_VC)).toEqual({ ok: true, shortfall: 0 });
    expect(affords(PRO_PRICE_VC - 10)).toEqual({ ok: false, shortfall: 10 });
    expect(affords(0, PRO_STORAGE_GB + 1).shortfall).toBe(PRO_PRICE_VC + 6);
  });
});

describe("status", () => {
  it("treats a profile with no record as never subscribed", () => {
    expect(proStatus(null, NOW).state).toBe("never");
    expect(proStatus(profile(), NOW).state).toBe("never");
    expect(proStatus(profile({ proUntil: "not-a-date" }), NOW).state).toBe("never");
  });

  it("honours an indefinite grant", () => {
    const s = proStatus(profile({ pro: true }), NOW);
    expect(s.state).toBe("active");
  });

  it("is active before the period ends and reports days left", () => {
    const s = proStatus(profile({ proUntil: iso(10) }), NOW);
    expect(s.state).toBe("active");
    if (s.state === "active") expect(s.daysLeft).toBe(10);
  });

  it("enters grace the moment the period ends", () => {
    const s = proStatus(profile({ proUntil: iso(-1) }), NOW);
    expect(s.state).toBe("grace");
  });

  it("stays in grace for the full window, then lapses", () => {
    expect(proStatus(profile({ proUntil: iso(-PRO_GRACE_DAYS + 1) }), NOW).state).toBe("grace");
    expect(proStatus(profile({ proUntil: iso(-PRO_GRACE_DAYS - 1) }), NOW).state).toBe("lapsed");
  });
});

describe("hosting", () => {
  it("hosts during an active period and throughout grace", () => {
    expect(canHostAudio(proStatus(profile({ proUntil: iso(5) }), NOW))).toBe(true);
    expect(canHostAudio(proStatus(profile({ proUntil: iso(-2) }), NOW))).toBe(true);
  });

  it("does not host once lapsed or never subscribed", () => {
    expect(canHostAudio(proStatus(profile({ proUntil: iso(-90) }), NOW))).toBe(false);
    expect(canHostAudio(proStatus(null, NOW))).toBe(false);
  });
});

describe("what happens to published audio", () => {
  it("never deletes a user's audio at any status", () => {
    const states = [iso(5), iso(-2), iso(-90)];
    for (const until of states) {
      const outcome = publishedAudioOutcome(proStatus(profile({ proUntil: until }), NOW));
      expect(outcome.deleted).toBe(false);
      expect(outcome.ownerCanDownload).toBe(true);
    }
    const never = publishedAudioOutcome(proStatus(null, NOW));
    expect(never.deleted).toBe(false);
    expect(never.ownerCanDownload).toBe(true);
  });

  it("keeps tracks public during grace and says how long is left", () => {
    const outcome = publishedAudioOutcome(proStatus(profile({ proUntil: iso(-1) }), NOW));
    expect(outcome.publiclyPlayable).toBe(true);
    expect(outcome.explanation).toMatch(/become private/i);
    expect(outcome.explanation).toMatch(/[Nn]othing is deleted/);
  });

  it("makes tracks private once lapsed, and says they are still the owner's", () => {
    const outcome = publishedAudioOutcome(proStatus(profile({ proUntil: iso(-90) }), NOW));
    expect(outcome.publiclyPlayable).toBe(false);
    expect(outcome.explanation).toMatch(/still yours/i);
    expect(outcome.explanation).toMatch(/downloadable/i);
  });
});

describe("renewal", () => {
  it("extends an unexpired period instead of truncating it", () => {
    const end = nextPeriodEnd(iso(10), NOW);
    expect(end).toBe(NOW + (10 + PRO_PERIOD_DAYS) * DAY);
  });

  it("starts from now when there is no period or it already ended", () => {
    expect(nextPeriodEnd(null, NOW)).toBe(NOW + PRO_PERIOD_DAYS * DAY);
    expect(nextPeriodEnd(iso(-5), NOW)).toBe(NOW + PRO_PERIOD_DAYS * DAY);
  });

  it("never loses paid time when renewing early", () => {
    const before = Date.parse(iso(20));
    expect(nextPeriodEnd(iso(20), NOW)).toBeGreaterThan(before);
  });
});
