import { expect, test } from "@playwright/test";

test("scan page offers camera and manual entry before any camera use", async ({ page }) => {
  await page.goto("/scan");
  await expect(page.getByRole("heading", { level: 1, name: "Scan a product" })).toBeVisible();
  await expect(page.getByRole("button", { name: /start scanning/i })).toBeVisible();
  await expect(page.getByLabel(/barcode number/i)).toBeVisible();
});

test("manual entry rejects a malformed barcode with spoken guidance", async ({ page }) => {
  await page.goto("/scan");
  await page.getByLabel(/barcode number/i).fill("12");
  await page.getByRole("button", { name: /look up/i }).click();
  await expect(page.getByTestId("live-region")).toContainText(/6 to 14 digits/i);
});

test("home links to both flows", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /scan a product/i })).toHaveAttribute(
    "href",
    "/scan",
  );
  await expect(page.getByRole("link", { name: /skin capture/i })).toHaveAttribute(
    "href",
    "/capture",
  );
});
