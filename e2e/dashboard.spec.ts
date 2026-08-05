import { test, expect } from "@playwright/test";

const FIXTURE = "/__e2e__/dashboard";

test.describe("Command dashboard", () => {
  test("renders without a reachable backend instead of erroring", async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId("command-dashboard")).toBeVisible();
  });

  test("an account with nothing offers a first scan rather than inventing figures", async ({ page }) => {
    await page.goto(FIXTURE);
    const empty = page.getByTestId("dashboard-empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText(/Nothing measured yet/i);
    await expect(page.getByTestId("dashboard-first-scan")).toBeVisible();

    // No fabricated counts on an empty account.
    await expect(page.getByTestId("dashboard-stats")).toHaveCount(0);
  });

  test("the first-scan control routes into the readiness flow", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("dashboard-first-scan").click();
    await expect(page).toHaveURL(/\/releases\/new/);
  });

  test("exposes a heading so the surface is navigable by structure", async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
