import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["junit", { outputFile: "reports/junit/playwright-junit.xml" }],
    ["html", { outputFolder: "reports/playwright-html", open: "never" }],
  ],
  use: {
    ...devices["Pixel 5"],
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8081",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      EXPO_PUBLIC_API_URL: "http://127.0.0.1:3002",
    },
  },
});
