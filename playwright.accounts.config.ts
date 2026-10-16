import { defineConfig, devices } from "@playwright/test";

/*
  The signed-in site: accounts on, an invite code for sign-up. Needs a local Postgres
  (postgres:x@127.0.0.1:5432) and the `pg` package (npm i --no-save pg); see scripts/neon-http-proxy.mjs.
    npm run test:e2e:accounts
*/
const PORT = 3101;
export const INVITE = "e2e-invite";

export default defineConfig({
  testDir: "e2e",
  testMatch: /accounts\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1280, height: 860 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 }, launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined } } }],
  webServer: [
    {
      command: "node scripts/neon-http-proxy.mjs 4445 postgres://postgres:x@127.0.0.1:5432/postgres",
      port: 4445,
      reuseExistingServer: false,
    },
    {
      command: `node -e "require('fs').rmSync('.next/dev/types',{recursive:true,force:true})" && npx next build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/api/config`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        ACCESS_CODE: INVITE,
        DATABASE_URL: "postgres://postgres:x@localhost/postgres",
        NEON_FETCH_ENDPOINT: "http://localhost:4445/sql",
        BLOB_STORE_ID: "",
        BLOB_READ_WRITE_TOKEN: "",
        AI_KEY_SECRET: "",
        ASSEMBLYAI_API_KEY: "test",
        GEMINI_API_KEY: "test",
      },
    },
  ],
});
