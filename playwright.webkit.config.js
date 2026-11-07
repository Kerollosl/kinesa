import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

export default defineConfig({
  ...base,
  testMatch: "assignment-layout.spec.js",
  outputDir: "test-results/webkit",
  use: {
    ...base.use,
    browserName: "webkit",
    // The primary configuration's SwiftShader flag is Chromium-specific.
    launchOptions: {},
  },
});
