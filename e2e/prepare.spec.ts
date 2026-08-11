import { test, expect } from "@playwright/test";
import { openScannedRelease, scanViaAnalyzer } from "./analyzerIntake";

test.describe("Prepare MVP", () => {
  test("scans audio on Analyzer desk and survives hard refresh", async ({ page }) => {
    test.setTimeout(120_000);
    const releaseId = await scanViaAnalyzer(page, "Fixture Artist - Phase 2 Fixture.wav");
    await openScannedRelease(page, releaseId);

    await expect(page.getByTestId("prepare-detail-title")).toHaveText("Phase 2 Fixture");
    await page.getByTestId("prepare-view-breakdown").click();
    await expect(page.getByTestId("prepare-findings-list")).toBeVisible();

    const url = page.url();
    await page.reload();
    await expect(page.getByTestId("prepare-detail-title")).toHaveText("Phase 2 Fixture");
    expect(page.url()).toBe(url);
  });
});
