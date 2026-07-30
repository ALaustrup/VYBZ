/**
 * Playwright — AI minute balance page + master low-balance banner.
 */
import { expect, test } from "@playwright/test";

test.describe("AI minute billing", () => {
  test("seeded credits fixture shows balance, ledger, and low banner", async ({ page }) => {
    await page.goto("/__e2e__/ai-credits");
    await expect(page.getByTestId("ai-credits-e2e-fixture")).toBeVisible();
    await expect(page.getByTestId("ai-credits-page")).toBeVisible();
    await expect(page.getByTestId("ai-credit-balance")).toBeVisible();
    await expect(page.getByTestId("ai-low-balance-banner")).toBeVisible();
    await expect(page.getByTestId("ai-credit-ledger")).toBeVisible();
    await expect(page.getByTestId("ai-credit-row").first()).toBeVisible();
    await expect(page.getByTestId("ai-topup-btn")).toBeVisible();
  });

  test("master page shows low-balance banner when prepaid seconds are low", async ({ page }) => {
    await page.goto("/__e2e__/mastering");
    await expect(page.getByTestId("release-master-pane")).toBeVisible();
    await expect(page.getByTestId("master-low-balance-banner")).toBeVisible();
    await page.getByTestId("analyze-master-btn").click();
    await expect(page.getByTestId("master-status-completed")).toBeVisible({ timeout: 15_000 });
  });
});
