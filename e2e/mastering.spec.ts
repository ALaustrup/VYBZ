/**
 * Playwright — Phase 15 AI Mastering: Analyze & Master → Completed → download WAV.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

test.describe("AI Mastering", () => {
  test("fixture runs Analyze & Master to Completed and downloads WAV", async ({ page }) => {
    await page.goto("/__e2e__/mastering");
    await expect(page.getByTestId("mastering-e2e-fixture")).toBeVisible();
    await expect(page.getByTestId("release-master-pane")).toBeVisible();
    await expect(page.getByTestId("master-file-name")).toBeVisible();

    await page.getByTestId("analyze-master-btn").click();
    await expect(page.getByTestId("master-job-status")).toHaveText("Completed", { timeout: 15_000 });
    await expect(page.getByTestId("master-status-completed")).toBeVisible();
    await expect(page.getByTestId("master-wave-ab")).toBeVisible();
    await expect(page.getByTestId("master-metadata")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("download-mastered-wav").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/mastered\.wav$/i);

    const tmp = path.join(os.tmpdir(), `vybz-mastered-${Date.now()}.wav`);
    await download.saveAs(tmp);
    const stat = fs.statSync(tmp);
    expect(stat.size).toBeGreaterThan(44);
    fs.unlinkSync(tmp);
  });

  test("A/B toggle routes selected side through VDock after Completed", async ({ page }) => {
    await page.goto("/__e2e__/mastering");
    await page.getByTestId("analyze-master-btn").click();
    await expect(page.getByTestId("master-status-completed")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("master-ab-a").click();
    await expect(page.getByTestId("master-play-vdock")).toBeVisible();
    await expect(page.getByTestId("master-ab-disclosure")).toBeVisible();
    await page.getByTestId("master-ab-b").click();
    await expect(page.getByTestId("master-play-vdock")).toBeVisible();
    await expect(page.getByTestId("master-wave-ab")).toBeVisible();
  });
});
