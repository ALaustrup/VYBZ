import { test, expect } from "@playwright/test";

/**
 * Two-user RLS e2e (no paid infra / no secrets).
 * Separate browser contexts + `vybz.e2e.ownerId` prove owner isolation
 * matching release_credits / release_projects owner_id = auth.uid() intent.
 */
test.describe("Two-user RLS (owner isolation)", () => {
  test("owner B cannot see owner A release", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.addInitScript(() => {
      sessionStorage.setItem("vybz.e2e.ownerId", "e2e-owner-a");
    });
    await pageB.addInitScript(() => {
      sessionStorage.setItem("vybz.e2e.ownerId", "e2e-owner-b");
    });

    await pageA.goto("/releases");
    await expect(pageA.getByTestId("prepare-releases")).toBeVisible();
    await pageA.getByTestId("prepare-new-release").click();
    await pageA.getByTestId("prepare-title").fill("Owner A Secret");
    await pageA.getByTestId("prepare-artist").fill("A Artist");
    await pageA.getByTestId("prepare-create-submit").click();
    await expect(pageA.getByTestId("prepare-detail-title")).toHaveText("Owner A Secret");

    await pageB.goto("/releases");
    await expect(pageB.getByTestId("prepare-releases")).toBeVisible();
    await expect(pageB.getByText("Owner A Secret")).toHaveCount(0);

    await ctxA.close();
    await ctxB.close();
  });
});
