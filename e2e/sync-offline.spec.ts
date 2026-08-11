import { test, expect } from "@playwright/test";
import { openScannedRelease, scanViaAnalyzer } from "./analyzerIntake";

test.describe("Offline sync merge", () => {
  test("offline edit → reconnect flush → accept mine", async ({ page, context }) => {
    test.setTimeout(120_000);
    const releaseId = await scanViaAnalyzer(page, "Sync Artist - Sync Fixture.wav");
    await openScannedRelease(page, releaseId);
    await page.getByTestId("prepare-open-credits").click();
    await expect(page.getByTestId("credits-page")).toBeVisible();

    await context.setOffline(true);
    await page.getByTestId("credits-name").fill("Offline Pat");
    await page.getByTestId("credits-role").selectOption("producer");
    await page.getByTestId("credits-add").click();
    await expect(page.getByText("Offline Pat")).toBeVisible();

    await context.setOffline(false);
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const sync = (window as unknown as { __vybzSync?: { pushConflict: (c: unknown) => void } }).__vybzSync;
      sync?.pushConflict({
        projectId: location.pathname.split("/")[2],
        field: "displayName",
        operation: "credit.update",
        mutationId: "e2e-m1",
        mine: "Offline Pat",
        theirs: "Server Pat",
        minePayload: { displayName: "Offline Pat" },
        theirsPayload: { displayName: "Server Pat" },
      });
    });

    await expect(page.getByTestId("sync-conflict")).toBeVisible();
    await expect(page.getByTestId("sync-conflict-mine")).toContainText("Offline Pat");
    await expect(page.getByTestId("sync-conflict-theirs")).toContainText("Server Pat");
    await page.getByTestId("sync-accept-mine").click();
    await expect(page.getByTestId("sync-conflict")).toHaveCount(0);
  });
});
