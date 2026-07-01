/**
 * ESLint flat configuration.
 *
 * Combines the recommended Vue 3 + TypeScript rules with Prettier so the
 * formatter never fights the linter. Custom rules are kept minimal — the
 * preset baselines are intentional choices we accept rather than override.
 */

import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/dist/**",
      "**/dist-ssr/**",
      "**/coverage/**",
      "**/node_modules/**",
      "src/api/schema.ts",
      "tests/e2e/**",
      "playwright.config.ts",
      // Design-handoff prototype (React/JSX reference material, not app code).
      "docs/**",
    ],
  },
  ...pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommendedTypeChecked,
  skipFormatting,
  {
    rules: {
      // Single-word component names are allowed only for views (route targets).
      "vue/multi-word-component-names": "warn",

      // Prefer explicit return types for exported functions but not for everything.
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // We use `void promise` to deliberately fire-and-forget; allow it.
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
    },
  },
  {
    // Vendored SHACL editor (adapted from Contour, Phase 19): its component
    // names (Canvas, Icon, Inspector, Palette) are single-word by origin and
    // internal to the editor; renaming would churn its cross-imports. Everything
    // else is held to the normal rules.
    name: "contour/vendored-component-names",
    files: ["src/components/shacl-editor/contour/components/*.vue"],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
);
