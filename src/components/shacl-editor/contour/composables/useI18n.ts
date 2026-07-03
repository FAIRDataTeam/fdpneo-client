/**
 * Schema-editor i18n shim.
 *
 * The vendored Contour editor components call `useI18n()` and expect Contour's
 * API — `t(key, params)` and `plural(key, n, params)` over dotted keys with
 * `{name}` interpolation and `{ one, other }` plural objects. Rather than rewrite
 * those ~300 call sites, this shim presents that exact surface but is backed by
 * the app's single `vue-i18n` instance: the editor strings live under the
 * `schemaEditor.*` namespace, and the active locale is whatever the locale store
 * has set on `vue-i18n` — so the header language switcher drives the editor too.
 *
 * Contour's own `useI18n` (browser detection + `localStorage`) is intentionally
 * NOT used; the client owns locale selection and forbids browser storage.
 */

import { computed } from "vue";
import { i18n } from "@/i18n";
import { useLocaleStore } from "@/stores/locale";

/** Namespace the editor bundles were composed under in `src/i18n/index.ts`. */
const NS = "schemaEditor";

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

export function useI18n() {
  const store = useLocaleStore();
  /** The active locale (kept in sync with vue-i18n by the locale store). */
  const locale = computed(() => store.current);

  /** Translate a dotted editor key with `{param}` interpolation. */
  function t(key: string, params?: Record<string, string | number>): string {
    return i18n.global.t(`${NS}.${key}`, params ?? {});
  }

  /** Resolve a `{ one, other }` plural key by `n` (interpolates `{n}` + params). */
  function plural(key: string, n: number, params?: Record<string, string | number>): string {
    const entry = i18n.global.tm(`${NS}.${key}`);
    const form = n === 1 ? "one" : "other";
    const tmpl =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>)[form] : undefined;
    if (typeof tmpl !== "string") return key;
    return interpolate(tmpl, { n, ...params });
  }

  /** Switch language through the client store (drives the whole app + editor). */
  function setLocale(next: string) {
    store.setLocale(next);
  }

  return { t, plural, locale, setLocale };
}
