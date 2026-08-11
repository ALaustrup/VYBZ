import { test, expect } from "@playwright/test";

test.describe("Suite smoke", () => {
  test("Analyzer intake desk is reachable via legacy /releases/new", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/releases/new");
    await expect(page).toHaveURL(/\/releases$/);
    await expect(page.getByTestId("prepare-releases")).toBeVisible();
    await expect(page.getByTestId("analyzer-dropzone")).toBeVisible();
  });
});

test.describe("a11y smoke", () => {
  test("document has a main landmark or app root", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/");
    const main = page.locator("main, #root");
    await expect(main.first()).toBeVisible();
  });

  test("Prepare releases expose main landmark and focusable dropzone", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/releases");
    await expect(page.getByTestId("prepare-releases")).toBeVisible();
    const main = page.locator("main");
    await expect(main.first()).toBeVisible();
    const dropzone = page.getByTestId("analyzer-dropzone");
    await dropzone.focus();
    await expect(dropzone).toBeFocused();
  });

  test("/settings/costs redirects away from Cost Sentinel", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/settings/costs");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByTestId("cost-sentinel-page")).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/settings\/costs/);
  });

  test("storefront settlement fixture exposes Pending manual", async ({ page }) => {
    await page.goto("/__e2e__/storefront-orders");
    await expect(page.getByTestId("storefront-orders-fixture")).toBeVisible();
    await expect(page.getByTestId("settlement-pending")).toBeVisible();
  });
});
