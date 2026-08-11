import { test, expect, type Page } from "@playwright/test";

/**
 * The palette replaced a read-only input that looked like search and did
 * nothing. These cover the things that made it a façade: that it opens, filters
 * real destinations, runs an action, and refuses to offer a dead end.
 */

const dialog = (page: Page) => page.getByRole("dialog", { name: /Command palette/i });

/**
 * Open the palette by clicking the trigger.
 *
 * Deliberately not the keyboard here. The shortcut is a `window` listener
 * registered in an effect, and effects flush after paint, so a keypress fired
 * immediately after load can land before the listener exists and be lost. A
 * click auto-waits for the button, which cannot race. The shortcut has its own
 * tests below, which retry to absorb that same race.
 */
async function openPalette(page: Page) {
  await page.goto("/__e2e__/shell");
  await page.getByRole("button", { name: /^Search VYBZ/ }).first().click();
  await expect(dialog(page)).toBeVisible();
  // Arrow and Enter handling lives on the input, and focus is applied in an
  // animation frame after open. Waiting for it makes later key presses reliable.
  await expect(page.getByRole("combobox")).toBeFocused();
}

/** Press the shortcut until it registers, then confirm the expected state. */
async function pressShortcutUntil(page: Page, expected: "open" | "closed") {
  await expect(async () => {
    await page.keyboard.press("Control+k");
    if (expected === "open") await expect(dialog(page)).toBeVisible({ timeout: 1000 });
    else await expect(dialog(page)).toBeHidden({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

test.describe("Command palette", () => {
  test("the trigger opens it and Escape closes it", async ({ page }) => {
    await openPalette(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
  });

  test("the keyboard shortcut opens it", async ({ page }) => {
    await page.goto("/__e2e__/shell");
    await expect(page.getByTestId("shell-fixture-stage")).toBeVisible();
    await pressShortcutUntil(page, "open");
  });

  test("the keyboard shortcut also closes it", async ({ page }) => {
    await openPalette(page);
    await pressShortcutUntil(page, "closed");
  });

  test("typing filters to a matching destination", async ({ page }) => {
    await openPalette(page);
    await page.getByRole("combobox").fill("libr");
    const options = page.getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("Library");
  });

  test("a keyword finds a destination whose title does not contain the query", async ({ page }) => {
    await openPalette(page);
    await page.getByRole("combobox").fill("readiness");
    await expect(page.getByRole("option").first()).toContainText("New Analyzer scan");
  });

  test("Enter navigates to the selected destination", async ({ page }) => {
    await openPalette(page);
    await page.getByRole("combobox").fill("libr");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/library$/);
  });

  test("arrow keys move the selection", async ({ page }) => {
    await openPalette(page);
    const options = page.getByRole("option");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await expect(options.first()).toHaveAttribute("aria-selected", "false");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("running an action invokes it rather than navigating", async ({ page }) => {
    await openPalette(page);
    await page.getByRole("combobox").fill("new drop");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("shell-fixture-fired")).toHaveText("compose");
    await expect(dialog(page)).toBeHidden();
    // Proves it ran the action instead of navigating.
    await expect(page).toHaveURL(/__e2e__\/shell$/);
  });

  test("an unavailable command is disabled and says why", async ({ page }) => {
    await openPalette(page);
    // Nothing is loaded in the fixture's player, so playback cannot run.
    await page.getByRole("combobox").fill("pause");
    const option = page.getByRole("option").first();
    await expect(option).toHaveAttribute("aria-disabled", "true");
    await expect(option).toContainText(/Nothing is loaded/i);
  });

  test("offers no placeholder product anywhere in the list", async ({ page }) => {
    await openPalette(page);
    // An empty query lists every command, so absence here is absence entirely.
    // Matching on the placeholder products' own titles rather than on a search
    // term, because "sentinel" legitimately matches the real Cost Sentinel page.
    for (const dead of ["CoverLab", "MasterReady", "Credit Passport", "Relay", "Wallet"]) {
      await expect(page.getByRole("option", { name: dead, exact: false })).toHaveCount(0);
    }
  });

  test("a search for a placeholder product finds nothing", async ({ page }) => {
    await openPalette(page);
    for (const dead of ["coverlab", "wallet"]) {
      await page.getByRole("combobox").fill(dead);
      await expect(page.getByText(/Nothing matches/i)).toBeVisible();
    }
  });

  test("states plainly when nothing matches", async ({ page }) => {
    await openPalette(page);
    await page.getByRole("combobox").fill("zzzzqqqq");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(page.getByText(/Nothing matches/i)).toBeVisible();
  });
});
