import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "docs/**",
      "public/**",
      "ios/**",
      "android/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "*.config.ts"],
    extends: [tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    // The app does not use the React Compiler, so only the classic hook rules
    // apply. v7's compiler rules (refs, purity, set-state-in-effect, ...) flag
    // deliberate patterns here: latest-callback refs and the question clock.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: [
      "tests/e2e/**/*.js",
      "scripts/capture-*.mjs",
      "scripts/play-through.mjs",
    ],
    // page.evaluate() callbacks run in the browser.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: [
      "*.js",
      "*.config.{js,ts}",
      "scripts/**/*.mjs",
      "tests/**/*.js",
      "capacitor.config.ts",
    ],
    languageOptions: { globals: { ...globals.node } },
  },
);
