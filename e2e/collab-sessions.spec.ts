/**
 * Playwright — Collaboration Sessions (presence, comments, merge conflict).
 */
import { expect, test } from "@playwright/test";

test.describe("Collaboration Sessions", () => {
  test("seeded fixture shows peers, comments, and merge conflict flow", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("vybz.intro", "1");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/__e2e__/collab");
    await expect(page.getByTestId("collab-e2e-fixture")).toBeVisible();
    await expect(page.getByTestId("collab-workspace")).toBeVisible();
    await expect(page.getByTestId("collab-presence-strip")).toBeVisible();
    await expect(page.getByTestId("collab-peer-chip").first()).toBeVisible();
    await expect(page.getByTestId("collab-cursor").first()).toBeVisible();

    await expect(page.getByTestId("collab-comments-panel")).toBeVisible();
    await expect(page.getByTestId("collab-comment-row").first()).toBeVisible();
    await expect(page.getByTestId("collab-comment-list")).toContainText("vinyl sticker");
    await expect(page.getByTestId("collab-comment-list")).toContainText("transient");

    await expect(page.getByTestId("collab-merge-panel")).toBeVisible();
    await expect(page.getByTestId("collab-row-version")).toHaveText("1");
    await expect(page.getByTestId("collab-merge-conflict")).toBeVisible();
    await expect(page.getByTestId("collab-merge-status")).toContainText("Conflict");

    await page.getByTestId("collab-merge-accept-theirs").dispatchEvent("click");
    await expect(page.getByTestId("collab-merge-conflict")).toHaveCount(0);
    await expect(page.getByTestId("collab-merge-status")).toContainText("Resolved");
  });

  test("fixture exposes live cursor layer and merge controls", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("vybz.intro", "1");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/__e2e__/collab");
    await expect(page.getByTestId("collab-cursors-layer")).toBeVisible();
    await expect(page.getByTestId("collab-merge-simulate-theirs")).toBeVisible();
    await expect(page.getByTestId("collab-merge-save")).toBeVisible();
    await expect(page.getByTestId("collab-peer-chip")).toHaveCount(3);
  });
});
