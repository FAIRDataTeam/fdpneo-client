/**
 * Vitest configuration.
 *
 * Standalone (does not extend vite.config.ts because that file uses the
 * callback form, which vitest's mergeConfig cannot consume).
 *
 * E2E tests live separately under tests/e2e/ and run via `npm run test:e2e`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// Mirror vite.config.ts's `__APP_VERSION__` define so components that read it
// (e.g. AboutDialog) work under test.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { version: string };

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
