import { defineConfig, devices } from "@playwright/test";
import path from "path";

const rootDir = import.meta.dirname;
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const useExternalServer = Boolean(process.env.E2E_BASE_URL);

// The client must be built with the E2E Supabase URL baked in so the fixture
// route intercepts (test.supabase.co) work. Run:
//   $env:VITE_SUPABASE_URL="https://test.supabase.co"; $env:VITE_SUPABASE_ANON_KEY="test-anon-key-for-e2e"; pnpm exec vite build
// once before running tests. The webServer then serves that pre-built dist/ in
// production mode, avoiding Vite's dep optimizer (which crashes on Node ≥25).
const E2E_SUPABASE_URL = "https://test.supabase.co";
const E2E_SUPABASE_ANON_KEY = "test-anon-key-for-e2e";

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
        `--use-file-for-fake-audio-capture=${path.resolve(rootDir, ".agents/test_3s_silence.wav")}`,
      ],
    },
  },
  webServer: useExternalServer
    ? undefined
    : {
        // Serve the pre-built client (dist/public, built with test.supabase.co)
        // via the production server — no Vite dep optimizer involved.
        command: "pnpm exec tsx server/index.ts",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NODE_ENV: "production",
          // Point serveStatic at the pre-built dist/public
          STATIC_DIR: path.resolve(rootDir, "dist", "public"),
          VERCEL: "",
          PORT: String(port),
          VITE_SUPABASE_URL: E2E_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: E2E_SUPABASE_ANON_KEY,
          SUPABASE_URL: E2E_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-for-e2e",
          OAUTH_SERVER_URL:
            process.env.OAUTH_SERVER_URL ?? `http://127.0.0.1:${port}`,
          JWT_SECRET: process.env.JWT_SECRET ?? "animalmind-e2e-secret",
        },
      },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
