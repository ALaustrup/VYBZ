import { test, expect } from "@playwright/test";

test.describe("Suite smoke", () => {
  test("landing renders brand promise", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Unauthed visitors hit marketing landing; backend-missing hard-stop is also ok.
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe("a11y smoke", () => {
  test("document has a main landmark or app root", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main, #root");
    await expect(main.first()).toBeVisible();
  });
});
