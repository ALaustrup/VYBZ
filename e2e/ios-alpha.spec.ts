/**
 * iOS Alpha smoke — mobile uploads + deep-link parse surface (Playwright web).
 * Device Detox / XCUITest runs on owner hardware; Vitest contract covers Keychain + links.
 */
import { expect, test } from "@playwright/test";

test.describe("ios alpha contracts", () => {
  test("mobile uploads page renders queue panel (shared with Android)", async ({ page }) => {
    await page.goto("/mobile/uploads");
    await expect(page.getByTestId("upload-queue-panel")).toBeVisible();
    await expect(page.getByTestId("upload-queue-title")).toContainText("Upload queue");
  });

  test("ios alpha a11y: main landmark on mobile uploads", async ({ page }) => {
    await page.goto("/mobile/uploads");
    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });
});
