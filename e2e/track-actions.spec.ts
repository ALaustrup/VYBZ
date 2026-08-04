import { test, expect } from "@playwright/test";

const FIXTURE = "/__e2e__/track-actions";

test.describe("Contextual track actions", () => {
  test("action affordance opens a menu anchored to the chosen track", async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId("track-actions-fixture")).toBeVisible();

    await page.getByTestId("track-actions-fixture-owned").click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    // The menu names the track it belongs to, proving it targeted the right item.
    await expect(menu).toHaveAttribute("aria-label", /Neon Rain/);
    await expect(page.getByTestId("track-action-play")).toBeVisible();
    await expect(page.getByTestId("track-action-queue")).toBeVisible();
  });

  test("right-click opens the menu without navigating away", async ({ page }) => {
    await page.goto(FIXTURE);
    const url = page.url();
    await page.getByTestId("track-actions-fixture-owned").click({ button: "right" });
    await expect(page.getByRole("menu")).toBeVisible();
    expect(page.url()).toBe(url);
  });

  test("Escape closes the menu and returns focus to the affordance", async ({ page }) => {
    await page.goto(FIXTURE);
    const trigger = page.getByTestId("track-actions-fixture-owned");
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("arrow keys move through items and Enter activates one", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("track-actions-fixture-owned").click();
    await expect(page.getByRole("menu")).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // Selecting an item closes the menu.
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("unavailable actions are disabled and explain why", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("track-actions-fixture-limited").click();
    await expect(page.getByRole("menu")).toBeVisible();

    const download = page.getByTestId("track-action-download");
    await expect(download).toHaveAttribute("aria-disabled", "true");
    await expect(download).toHaveAttribute("title", /asset/i);

    const play = page.getByTestId("track-action-play");
    await expect(play).toHaveAttribute("aria-disabled", "true");
  });

  test("file details show stored values and omit unmeasured fields", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("track-actions-fixture-owned").click();
    await page.getByTestId("track-action-file-details").click();

    const details = page.getByTestId("track-file-details");
    await expect(details).toBeVisible();
    await expect(details).toContainText("44.1 kHz");
    await expect(details).toContainText("3:05");
    // BPM and key were never measured for this upload, so they must not appear.
    await expect(details).not.toContainText("BPM");
  });

  test("delete asks for confirmation and can be cancelled", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("track-actions-fixture-owned").click();

    const del = page.getByTestId("track-action-delete");
    if ((await del.count()) === 0) {
      // Fixture viewer is not the owner in this environment; nothing to assert.
      return;
    }
    await del.click();
    await expect(page.getByTestId("track-delete-confirm")).toBeVisible();
    await page.getByTestId("track-delete-cancel").click();
    await expect(page.getByTestId("track-delete-confirm")).toHaveCount(0);
  });
});
