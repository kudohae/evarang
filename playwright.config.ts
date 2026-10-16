import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  // The signed-in site has its own config with a database (playwright.accounts.config.ts).
  testIgnore: /accounts\.spec\.ts/,
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
    // Accounts and storage off: the flow under test is the anonymous mock exam.
    // A production build, not `next dev`: dev's hot reload sometimes falls into a reload loop
    // ("HMR hash mismatch") right after files change, which made whole runs time out.
    // Route types left by an earlier `next dev` can name deleted pages and fail the build's type check.
    command: `node -e "require('fs').rmSync('.next/dev/types',{recursive:true,force:true})" && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/config`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { DATABASE_URL: "", POSTGRES_URL: "", BLOB_STORE_ID: "", BLOB_READ_WRITE_TOKEN: "", ASSEMBLYAI_API_KEY: "test", GEMINI_API_KEY: "test" },
  },
});
