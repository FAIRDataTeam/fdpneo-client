/**
 * Vitest global setup.
 *
 * Runs once before each test file. Add module-level mocks here only when
 * they apply universally — per-test mocks belong in the test files.
 */

import { vi } from "vitest";

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
