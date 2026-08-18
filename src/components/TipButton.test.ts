import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("live Stripe tips", () => {
  it("starts Checkout through the existing stripe-tip path", () => {
    const api = read("src/lib/api.ts");
    expect(api).toContain("export async function startTip");
    expect(api).toContain("stripe-tip");
    expect(api).toContain("creator_tips_enabled");
    const btn = read("src/components/TipButton.tsx");
    expect(btn).toContain("creatorTipsEnabled");
    expect(btn).toContain("startTip");
    expect(btn).toContain("FLAGS.tips");
    expect(btn).toContain("Could not start tip.");
    expect(btn).not.toMatch(/airtime_ledger|award_|grant_bootstrap|get_airtime_balance/i);
  });

  it("is on the watch stage and host profile, and hides when payouts are off", () => {
    const watch = read("src/pages/LiveWatchPage.tsx");
    expect(watch).toContain("TipButton");
    expect(watch).toContain("VcTipSheet");
    const profile = read("src/features/profile/ArtistStageProfile.tsx");
    expect(profile).toContain("TipButton");
    const btn = read("src/components/TipButton.tsx");
    expect(btn).toContain("if (!FLAGS.tips || !enabled) return null");
    expect(btn).toContain("startTip");
  });
});
