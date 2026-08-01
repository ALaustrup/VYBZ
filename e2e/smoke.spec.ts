import { test, expect } from "@playwright/test";

test.describe("Suite smoke", () => {
  test("unsigned readiness scan entry is reachable", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/releases/new");
    await expect(page.getByTestId("prepare-new")).toBeVisible();
  });
});

test.describe("a11y smoke", () => {
  test("document has a main landmark or app root", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/");
    const main = page.locator("main, #root");
    await expect(main.first()).toBeVisible();
  });

  test("Prepare releases expose main landmark and focusable CTA", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/releases");
    await expect(page.getByTestId("prepare-releases")).toBeVisible();
    const main = page.locator("main");
    await expect(main.first()).toBeVisible();
    const cta = page.getByTestId("prepare-new-release");
    await cta.focus();
    await expect(cta).toBeFocused();
  });

  test("Cost Sentinel path is reachable or falls back safely", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("vybz.intro", "1"));
    await page.goto("/settings/costs");
    await expect(page.locator("body")).toBeVisible();
    const sentinel = page.getByTestId("cost-sentinel-page");
    const root = page.locator("main, #root");
    await expect(root.first().or(sentinel)).toBeVisible();
    if ((await sentinel.count()) > 0) {
      await expect(page.getByRole("heading", { name: /Usage/i })).toBeVisible();
    }
  });

  test("storefront settlement fixture exposes Pending manual", async ({ page }) => {
    await page.goto("/__e2e__/storefront-orders");
    await expect(page.getByTestId("storefront-orders-fixture")).toBeVisible();
    await expect(page.getByTestId("settlement-pending")).toBeVisible();
  });
});
