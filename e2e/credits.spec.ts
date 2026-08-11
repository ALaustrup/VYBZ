import { test, expect } from "@playwright/test";
import { openScannedRelease, scanViaAnalyzer } from "./analyzerIntake";

test.describe("Credits MVP", () => {
  test("adds credits, hard refresh persists", async ({ page }) => {
    test.setTimeout(120_000);
    const releaseId = await scanViaAnalyzer(page, "Fixture Artist - Credits Fixture.wav");
    await openScannedRelease(page, releaseId);

    await expect(page.getByTestId("prepare-detail-title")).toHaveText("Credits Fixture");

    await page.getByTestId("prepare-open-credits").click();
    await expect(page.getByTestId("credits-page")).toBeVisible();
    await expect(page.getByTestId("credits-release-title")).toHaveText("Credits Fixture");

    await expect(page.getByTestId("credits-list")).toBeVisible();
    await expect(page.getByText("Fixture Artist").first()).toBeVisible();

    await page.getByTestId("credits-name").fill("Producer Pat");
    await page.getByTestId("credits-role").selectOption("producer");
    await page.getByTestId("credits-add").click();
    await expect(page.getByText("Producer Pat")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("credits-page")).toBeVisible();
    await expect(page.getByText("Producer Pat")).toBeVisible();
    await expect(page.getByText("Fixture Artist").first()).toBeVisible();
  });
});
