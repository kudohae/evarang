import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 860 },
    permissions: ["microphone"],
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
        launchOptions: {
          executablePath: process.env.CHROMIUM_PATH || undefined,
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
        },
      },
    },
  ],
  webServer: {
    // Accounts, storage and access code off: the flow under test is the anonymous mock exam.
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/config`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_BROWSER_LOGS: "off", ACCESS_CODE: "", DATABASE_URL: "", POSTGRES_URL: "", BLOB_STORE_ID: "", BLOB_READ_WRITE_TOKEN: "", ASSEMBLYAI_API_KEY: "test", GEMINI_API_KEY: "test" },
  },
});
