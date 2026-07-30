/**
 * Android Beta smoke — upload queue UI + a11y landmark.
 * Full AAB / Detox device runs on CI android.yml + owner device.
 * Deep-link parse covered by unit tests in src/platform/deeplinks.
 */
import { expect, test } from "@playwright/test";

test.describe("android beta contracts", () => {
  test("mobile uploads page renders queue panel", async ({ page }) => {
    await page.goto("/mobile/uploads");
    await expect(page.getByTestId("android-beta-title")).toBeVisible();
    await expect(page.getByTestId("upload-queue-panel")).toBeVisible();
    await expect(page.getByTestId("upload-queue-title")).toContainText("Upload queue");
  });

  test("android beta a11y: main landmark present", async ({ page }) => {
    await page.goto("/android/beta");
    const main = page.locator("main[data-testid='android-beta-page']");
    await expect(main).toBeVisible();
    await expect(page.getByTestId("upload-queue-drain")).toBeVisible();
  });
});
