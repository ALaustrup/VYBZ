import { test, expect } from "@playwright/test";

test.describe("Storefront platform settlement", () => {
  test("post-checkout Orders UI shows Pending manual", async ({ page }) => {
    await page.goto("/__e2e__/storefront-orders");
    await expect(page.getByTestId("storefront-orders-fixture")).toBeVisible();
    await expect(page.getByTestId("storefront-orders")).toBeVisible();
    await expect(page.getByTestId("settlement-pending")).toHaveText(/Pending manual/i);
  });
});
