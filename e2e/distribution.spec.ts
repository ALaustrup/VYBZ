import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.describe("Distribution readiness", () => {
  test("report + ZIP export download records SHA", async ({ page }) => {
    await page.goto("/releases");
    await expect(page.getByTestId("prepare-releases")).toBeVisible();
    await page.getByTestId("prepare-new-release").click();
    await page.getByTestId("prepare-title").fill("Dist Fixture");
    await page.getByTestId("prepare-artist").fill("Dist Artist");
    await page.getByTestId("prepare-create-submit").click();
    await expect(page.getByTestId("prepare-detail")).toBeVisible();

    await page.getByTestId("prepare-open-distribution").click();
    await expect(page.getByTestId("distribution-page")).toBeVisible();
    await expect(page.getByTestId("distribution-verdict")).toBeVisible();
    await expect(page.getByTestId("distribution-loudness")).toContainText(/Not measured|LUFS/i);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("distribution-export").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      if (!stream) {
        reject(new Error("no download stream"));
        return;
      }
      stream.on("data", (c) => chunks.push(Buffer.from(c)));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });
    const buf = Buffer.concat(chunks);
    const sha256 = createHash("sha256").update(buf).digest("hex");
    expect(sha256).toHaveLength(64);

    await expect(page.getByTestId("distribution-export-sha")).toContainText(sha256);

    const outDir = path.resolve("android/signing");
    mkdirSync(path.resolve("docs/operations"), { recursive: true });
    const record = {
      recordedAt: new Date().toISOString(),
      fileName: download.suggestedFilename(),
      sha256,
      bytes: buf.length,
      source: "e2e/distribution.spec.ts",
    };
    writeFileSync(
      path.resolve("docs/operations/DISTRIBUTION_EXPORT_HASHES.json"),
      `${JSON.stringify(record, null, 2)}\n`
    );
    // keep variable used (lint)
    void outDir;
  });
});
