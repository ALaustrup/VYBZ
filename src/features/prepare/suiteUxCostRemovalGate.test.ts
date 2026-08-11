/**
 * Suite UX — Cost Sentinel + AI minutes removed from product surfaces.
 * Mastering stays available without prepaid balance (no invented billing).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Suite UX cost / AI-minutes removal", () => {
  it("does not mount Cost Sentinel or AI minutes pages", () => {
    const app = read("src/App.tsx");
    expect(app).not.toContain("CostSentinelDashboardPage");
    expect(app).not.toContain("AiCreditsPage");
    expect(app).toMatch(/settings\/costs[\s\S]{0,80}Navigate/);
    expect(app).toMatch(/settings\/credits[\s\S]{0,80}Navigate/);
  });

  it("suite nav does not send V¢ to AI minutes", () => {
    const apps = read("src/shell/suiteApps.ts");
    expect(apps).not.toMatch(/path:\s*"\/settings\/credits"/);
    expect(apps).not.toMatch(/path:\s*"\/settings\/costs"/);
  });

  it("mastering has no prepaid AI-credit hard gate", () => {
    const svc = read("src/features/mastering/aiMasterService.ts");
    expect(svc).not.toContain("getAiCreditBalance");
    expect(svc).not.toContain("debitAICredits");
    expect(svc).not.toMatch(/top up at \/settings\/credits/);
    const pane = read("src/features/mastering/ReleaseMasterPane.tsx");
    expect(pane).not.toContain("/settings/credits");
    expect(pane).not.toContain("master-low-balance-banner");
  });

  it("authorises Suite UX cost removal in AGENTS", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("Suite UX");
    expect(agents).toContain("suiteUxCostRemovalGate");
  });

  it("withdraws Cost Sentinel e2e fixtures from the tree or leaves them unreferenced", () => {
    const fixtures = read("src/app/e2eFixtures.tsx");
    expect(fixtures).not.toContain("CostSentinelE2EFixturePage");
    expect(fixtures).not.toContain("AiCreditsE2EFixturePage");
    expect(fixtures).not.toContain("/__e2e__/cost-sentinel");
    expect(fixtures).not.toContain("/__e2e__/ai-credits");
  });

  it("settings edit has no V¢ pack money surface", () => {
    const edit = read("src/pages/ProfileEditPage.tsx");
    expect(edit).not.toContain("CREDIT_PACKS");
    expect(edit).not.toContain("startCreditTopup");
    expect(edit).not.toContain('id="packages"');
  });
});
