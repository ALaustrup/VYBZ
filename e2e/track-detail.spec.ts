import { test, expect } from "@playwright/test";

test.describe("Track detail", () => {
  test("an unreachable track states so and offers a way back", async ({ page }) => {
    await page.goto("/__e2e__/track-detail");
    await expect(page.getByTestId("track-detail-fixture")).toBeVisible();
    await expect(page.getByText(/Track unavailable/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to library/i })).toBeVisible();
  });

  test("the back link routes to the library", async ({ page }) => {
    await page.goto("/__e2e__/track-detail");
    await page.getByRole("link", { name: /Back to library/i }).click();
    await expect(page).toHaveURL(/\/library/);
  });
});

test.describe("Track detail — reachable from a track menu", () => {
  test("Open track appears in the contextual menu and is enabled", async ({ page }) => {
    await page.goto("/__e2e__/track-actions");
    await page.getByTestId("track-actions-fixture-owned").click();
    const open = page.getByTestId("track-action-open-track");
    await expect(open).toBeVisible();
    await expect(open).toHaveAttribute("aria-disabled", "false");
  });

  test("Open track navigates to the track workspace for that exact track", async ({ page }) => {
    await page.goto("/__e2e__/track-actions");
    await page.getByTestId("track-actions-fixture-limited").click();
    await page.getByTestId("track-action-open-track").click();
    // Must target the track whose menu was opened, not the other card.
    await expect(page).toHaveURL(/\/track\/fixture-limited$/);
  });
});
