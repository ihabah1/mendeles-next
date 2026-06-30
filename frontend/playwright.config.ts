import { defineConfig } from "@playwright/test";

const frontendUrl =
  process.env.FRONTEND_URL?.replace(/\/$/, "") ||
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
  },
});
