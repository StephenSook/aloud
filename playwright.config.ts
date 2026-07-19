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
    { name: "mobile-safari-viewport", use: { ...devices["iPhone 14"], browserName: "chromium" } },
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
