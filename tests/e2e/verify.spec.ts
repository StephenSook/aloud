import { expect, test } from "@playwright/test";

test("verify page explains the comparison and gates on a tap", async ({ page }) => {
  await page.goto("/verify");
  await expect(
    page.getByRole("heading", { level: 1, name: "Verify your look" }),
  ).toBeVisible();
  await expect(page.getByText(/bare-skin capture/i)).toBeVisible();
  await expect(page.getByText(/nothing is saved/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /start the camera/i })).toBeVisible();
});
