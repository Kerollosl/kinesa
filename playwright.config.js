import { defineConfig } from "@playwright/test";

// Override when another local app already owns 5173.
const port = Number(process.env.KINESA_PORT || 5173);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Keep motion sampling and interruption checks deterministic.
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--enable-unsafe-swiftshader"],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    },
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
