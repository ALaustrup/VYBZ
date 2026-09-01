import { test, expect } from "@playwright/test";

const FIXTURE = "/__e2e__/library";

test.describe("Media library — search, filter, sort", () => {
  test("search narrows the list and reports how many matched", async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByTestId("library-count")).toHaveText("4 works");

    await page.getByTestId("library-search").fill("neon");
    await expect(page.getByTestId("library-count")).toHaveText("1 of 4");
    await expect(page.getByText("Neon Rain").first()).toBeVisible();
    await expect(page.getByText("Aurora")).toHaveCount(0);
  });

  test("search matches album as well as title", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-search").fill("night drive");
    await expect(page.getByTestId("library-count")).toHaveText("2 of 4");
  });

  test("no results shows a recoverable empty state", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-search").fill("zzzzz-no-match");
    await expect(page.getByText(/Nothing matches those filters/i)).toBeVisible();
  });

  test("filters combine and can be cleared in one action", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-filters-toggle").click();
    await expect(page.getByTestId("library-filters")).toBeVisible();

    await page.getByTestId("library-filter-lossless").click();
    await expect(page.getByTestId("library-count")).toHaveText("2 of 4");

    await page.getByTestId("library-filter-duration").selectOption("over-6m");
    await expect(page.getByTestId("library-count")).toHaveText("1 of 4");

    await page.getByTestId("library-filters-clear").click();
    await expect(page.getByTestId("library-count")).toHaveText("4 works");
  });

  test("filter count badge reflects how many filters are narrowing", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-filters-toggle").click();
    await page.getByTestId("library-filter-lossless").click();
    await expect(page.getByTestId("library-filters-toggle")).toHaveText(/1 filter/);
    await page.getByTestId("library-filter-asset").click();
    await expect(page.getByTestId("library-filters-toggle")).toHaveText(/2 filters/);
  });

  test("sorting reorders results", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-view-list").click();

    await page.getByTestId("library-sort").selectOption("title-asc");
    const first = page.getByTestId("library-results").getByRole("listitem").first();
    await expect(first).toContainText("Aurora");

    await page.getByTestId("library-sort").selectOption("most-played");
    await expect(page.getByTestId("library-results").getByRole("listitem").first()).toContainText(
      "Aurora",
    );

    await page.getByTestId("library-sort").selectOption("title-desc");
    await expect(page.getByTestId("library-results").getByRole("listitem").first()).toContainText(
      "Untitled sketch",
    );
  });

  test("grouping splits results under headings without losing tracks", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-group").selectOption("album");
    await expect(page.getByTestId("library-group")).toHaveValue("album");
    await expect(page.getByRole("heading", { name: /Night Drive/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Singles/i })).toBeVisible();
    await expect(page.getByTestId("library-count")).toHaveText("4 works");
  });

  test("view switching keeps the same result count", async ({ page }) => {
    await page.goto(FIXTURE);
    for (const view of ["list", "table", "grid"]) {
      await page.getByTestId(`library-view-${view}`).click();
      await expect(page.getByTestId("library-count")).toHaveText("4 works");
    }
  });
});

test.describe("Media library — multi-select and batch", () => {
  test("selecting shows the batch bar with an accurate count", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-view-list").click();

    await expect(page.getByTestId("batch-bar")).toHaveCount(0);
    await page.getByTestId("library-select-item").first().click();
    await expect(page.getByTestId("batch-bar")).toBeVisible();
    await expect(page.getByTestId("batch-count")).toHaveText("1 selected");

    await page.getByTestId("library-select-item").nth(1).click();
    await expect(page.getByTestId("batch-count")).toHaveText("2 selected");
  });

  test("select all selects every visible track and toggles back", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-select-all").click();
    await expect(page.getByTestId("batch-count")).toHaveText("4 selected");
    await page.getByTestId("library-select-all").click();
    await expect(page.getByTestId("batch-bar")).toHaveCount(0);
  });

  test("select all respects the active filter", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-search").fill("night drive");
    await page.getByTestId("library-select-all").click();
    await expect(page.getByTestId("batch-count")).toHaveText("2 selected");
  });

  test("shift-click extends a range", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-view-list").click();
    await page.getByTestId("library-select-item").first().click();
    await page.getByTestId("library-select-item").nth(2).click({ modifiers: ["Shift"] });
    await expect(page.getByTestId("batch-count")).toHaveText("3 selected");
  });

  test("clearing selection dismisses the batch bar", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-select-all").click();
    await page.getByTestId("batch-clear").click();
    await expect(page.getByTestId("batch-bar")).toHaveCount(0);
  });

  test("batch delete requires confirmation and can be cancelled", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-select-all").click();
    await page.getByTestId("batch-delete").click();

    const confirm = page.getByTestId("batch-delete-confirm");
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("Delete 4");

    await page.getByTestId("batch-delete-cancel").click();
    await expect(confirm).toHaveCount(0);
    // Nothing was removed.
    await expect(page.getByTestId("library-count")).toHaveText("4 works");
  });

  test("selection survives changing the sort order", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-view-list").click();
    await page.getByTestId("library-select-item").first().click();
    await expect(page.getByTestId("batch-count")).toHaveText("1 selected");
    await page.getByTestId("library-sort").selectOption("oldest");
    await expect(page.getByTestId("batch-count")).toHaveText("1 selected");
  });

  test("selection drops items hidden by a filter", async ({ page }) => {
    await page.goto(FIXTURE);
    await page.getByTestId("library-select-all").click();
    await expect(page.getByTestId("batch-count")).toHaveText("4 selected");
    await page.getByTestId("library-search").fill("neon");
    await expect(page.getByTestId("batch-count")).toHaveText("1 selected");
  });
});
