import { defineConfig, devices } from "@playwright/test";

const AUTH_STATE = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.js/
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE,
        viewport: { width: 1440, height: 1000 }
      },
      dependencies: ["setup"]
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"] ,
        storageState: AUTH_STATE
      },
      dependencies: ["setup"]
    }
  ]
});
