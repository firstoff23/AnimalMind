import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const rootDir = import.meta.dirname;
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const useExternalServer = Boolean(process.env.E2E_BASE_URL);

for (const envFile of [".env.local", ".env.production.local"]) {
  const envPath = path.resolve(rootDir, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    permissions: ["microphone", "camera"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "pnpm exec tsx server/index.ts",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NODE_ENV: "development",
          VERCEL: "",
          PORT: String(port),
          VITE_SUPABASE_URL:
            process.env.VITE_SUPABASE_URL ??
            process.env.SUPABASE_URL ??
            "https://test.supabase.co",
          VITE_SUPABASE_ANON_KEY:
            process.env.VITE_SUPABASE_ANON_KEY ??
            process.env.SUPABASE_ANON_KEY ??
            "test-anon-key-for-e2e",
          SUPABASE_URL: process.env.SUPABASE_URL ?? "https://test.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY:
            process.env.SUPABASE_SERVICE_ROLE_KEY ??
            "test-service-role-key-for-e2e",
          OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL ?? `http://127.0.0.1:${port}`,
          JWT_SECRET: process.env.JWT_SECRET ?? "animalmind-e2e-secret",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
