import { expect, test } from "@playwright/test";

test("talk page renders with a start affordance and live region", async ({ page }) => {
  await page.goto("/talk");
  await expect(page.getByRole("heading", { level: 1, name: "Talk with Aloud" })).toBeVisible();
  await expect(page.getByTestId("voice-start")).toBeVisible();
  await expect(page.getByTestId("live-region")).toHaveAttribute("aria-live", "assertive");
});

// Live WebRTC session against the real Realtime API. Costs money and needs
// network + keys, so it only runs when explicitly requested:
//   RUN_LIVE_VOICE=1 npx playwright test tests/e2e/talk.spec.ts
test("live voice session connects end to end", async ({ page }) => {
  test.skip(!process.env.RUN_LIVE_VOICE, "set RUN_LIVE_VOICE=1 to run the live voice test");
  await page.goto("/talk");
  await page.getByTestId("voice-start").click();
  await expect(page.getByTestId("voice-stop")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/voice line open/i)).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("voice-stop").click();
  await expect(page.getByTestId("voice-start")).toBeVisible();
});
