import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Browser checks share a software GPU; serialize them for stable frame timing.
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
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
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
