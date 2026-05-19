/**
 * End-to-end smoke test.
 *
 * The first real test that runs against the full stack. More e2e tests are
 * added per surface as the views become functional.
 */

import { test, expect } from "@playwright/test";

test("home page loads with brand visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("FAIR Data Point")).toBeVisible();
});
