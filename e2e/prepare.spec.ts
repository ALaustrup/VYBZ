import { test, expect } from "@playwright/test";

test.describe("Prepare MVP", () => {
  test("creates a release with findings and survives hard refresh", async ({ page }) => {
    await page.goto("/releases");
    await expect(page.getByTestId("prepare-releases")).toBeVisible();

    await page.getByTestId("prepare-new-release").click();
    await expect(page.getByTestId("prepare-new")).toBeVisible();

    await page.getByTestId("prepare-title").fill("Phase 2 Fixture");
    await page.getByTestId("prepare-artist").fill("Fixture Artist");
    await page.getByTestId("prepare-create-submit").click();

    await expect(page.getByTestId("prepare-detail")).toBeVisible();
    await expect(page.getByTestId("prepare-detail-title")).toHaveText("Phase 2 Fixture");
    await expect(page.getByTestId("prepare-findings-list")).toBeVisible();
    await expect(page.getByTestId("prepare-finding-AUDIO_MISSING")).toBeVisible();

    const url = page.url();
    await page.reload();
    await expect(page.getByTestId("prepare-detail-title")).toHaveText("Phase 2 Fixture");
    expect(page.url()).toBe(url);

    await page.goto("/releases");
    await expect(page.getByText("Phase 2 Fixture")).toBeVisible();
  });
});
