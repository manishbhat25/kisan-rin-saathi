import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT || "3100";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  // Journeys share seeded accounts and the officer queues, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec/ },
    { name: "responsive", use: { ...devices["Desktop Chrome"] }, testMatch: /responsive\.spec/ },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
  },
});
