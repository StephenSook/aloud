import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-safari-viewport",
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
        // Fake camera/mic so permissioned flows run headless (green frames,
        // test tone). Real-device behavior is verified on hardware.
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
  // Dedicated port: 3000 is often occupied by unrelated dev servers, and
  // reuseExistingServer would silently test the wrong app.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start -- -p 3100",
        port: 3100,
        reuseExistingServer: false,
      },
});
