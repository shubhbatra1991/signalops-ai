import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3210";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", testIgnore: /[\\/]accessibility\.spec\.ts$/, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testIgnore: /[\\/]accessibility\.spec\.ts$/, use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run start -- --hostname 127.0.0.1 --port 3210"
      : "npm run build && npm run start -- --hostname 127.0.0.1 --port 3210",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      SIGNALOPS_DEPLOYMENT_MODE: "public-demo",
      AI_ENABLE_PROVIDER_REQUESTS: "false",
      AI_APP_ORIGIN: baseURL,
    },
  },
});
