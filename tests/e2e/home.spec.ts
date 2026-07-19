import { expect, test } from "@playwright/test";

test("home shell renders accessibly", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Aloud" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("live-region")).toHaveAttribute("aria-live", /polite|assertive/);
});
