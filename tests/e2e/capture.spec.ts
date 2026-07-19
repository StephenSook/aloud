import { expect, test } from "@playwright/test";

test("capture page presents consent before any camera use", async ({ page }) => {
  await page.goto("/capture");
  await expect(page.getByRole("heading", { level: 1, name: "Skin capture" })).toBeVisible();
  await expect(page.getByText(/processed for this session only/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /I agree, start the camera/i }),
  ).toBeVisible();
  await expect(page.getByTestId("live-region")).toHaveAttribute("aria-live", "assertive");
});

test("home links to the capture flow", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /know your skin/i }),
  ).toHaveAttribute("href", "/capture");
});
