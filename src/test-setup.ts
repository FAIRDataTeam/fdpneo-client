/**
 * Vitest global setup.
 *
 * Runs once before each test file. Add module-level mocks here only when
 * they apply universally — per-test mocks belong in the test files.
 */

import { vi } from "vitest";
import { config } from "@vue/test-utils";
import { i18n } from "@/i18n";

// Install vue-i18n into every mount so components using `useI18n()` render
// their real (English) copy under test instead of throwing. Individual specs
// can still switch the locale via the locale store / i18n.global.locale.
config.global.plugins = [...(config.global.plugins ?? []), i18n];

// jsdom doesn't implement matchMedia; some PrimeVue components query it.
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
