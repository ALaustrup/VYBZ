import { test, expect } from "@playwright/test";

test.describe("Credits MVP", () => {
  test("adds credits, hard refresh persists", async ({ page }) => {
    await page.goto("/releases");
    await expect(page.getByTestId("prepare-releases")).toBeVisible();
    await page.getByTestId("prepare-new-release").click();
    await expect(page.getByTestId("prepare-new")).toBeVisible();

    await page.getByTestId("prepare-title").fill("Credits Fixture");
    await page.getByTestId("prepare-artist").fill("Fixture Artist");
    await expect(page.getByTestId("prepare-title")).toHaveValue("Credits Fixture");
    await expect(page.getByTestId("prepare-artist")).toHaveValue("Fixture Artist");
    await page.getByTestId("prepare-create-submit").click();

    await expect(page.getByTestId("prepare-detail")).toBeVisible();
    await expect(page.getByTestId("prepare-detail-title")).toHaveText("Credits Fixture");

    await page.getByTestId("prepare-open-credits").click();
    await expect(page.getByTestId("credits-page")).toBeVisible();
    await expect(page.getByTestId("credits-release-title")).toHaveText("Credits Fixture");

    // Artist seeded from release metadata
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
