/**
 * Playwright configuration for end-to-end tests.
 *
 * E2E tests run against a fully assembled stack: the FDP server (docker compose
 * in `server/deploy/stack`) + the SPA. They are currently a MANUAL gate — CI
 * (`.github/workflows/ci.yml`) runs lint/typecheck/unit/build only and does NOT
 * bring up the server stack or invoke `npm run test:e2e`. Wiring full-stack e2e
 * into CI (standing up Postgres/GraphDB/Keycloak/server) is a separate task.
 *
 * To run locally: start the docker stack, then `npm run dev`, then
 * `npm run test:e2e`. The webServer block below auto-starts the SPA when not in
 * CI; the backend must already be running (the smoke test reads the repository
 * title the server serves).
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],

  // Optional: start the dev server automatically when running locally.
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
