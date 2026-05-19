/**
 * Vitest configuration.
 *
 * Standalone (does not extend vite.config.ts because that file uses the
 * callback form, which vitest's mergeConfig cannot consume).
 *
 * E2E tests live separately under tests/e2e/ and run via `npm run test:e2e`.
 */

import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    name: "unit",
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts"],
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    root: fileURLToPath(new URL("./", import.meta.url)),
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,vue}"],
      exclude: ["src/**/*.{test,spec}.ts", "src/test-setup.ts", "src/api/schema.ts"],
    },
  },
});
