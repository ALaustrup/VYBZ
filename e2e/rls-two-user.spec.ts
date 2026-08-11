import { test, expect } from "@playwright/test";
import { openScannedRelease, scanViaAnalyzer } from "./analyzerIntake";

/**
 * Two-user RLS e2e (no paid infra / no secrets).
 * Separate browser contexts + `vybz.e2e.ownerId` prove owner isolation
 * matching release_credits / release_projects owner_id = auth.uid() intent.
 */
test.describe("Two-user RLS (owner isolation)", () => {
  test("owner B cannot open owner A release", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.addInitScript(() => {
      sessionStorage.setItem("vybz.e2e.ownerId", "e2e-owner-a");
    });
    await pageB.addInitScript(() => {
      sessionStorage.setItem("vybz.e2e.ownerId", "e2e-owner-b");
    });

    const releaseId = await scanViaAnalyzer(pageA, "A Artist - Owner A Secret.wav");
    await openScannedRelease(pageA, releaseId);
    await expect(pageA.getByTestId("prepare-detail-title")).toHaveText("Owner A Secret");
    const secretUrl = pageA.url();

    await pageB.goto(secretUrl);
    await expect(pageB.getByTestId("prepare-detail-title")).toHaveCount(0);
    await expect(pageB.getByText("Owner A Secret")).toHaveCount(0);

    await ctxA.close();
    await ctxB.close();
  });
});
