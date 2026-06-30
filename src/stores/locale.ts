/**
 * Locale store.
 *
 * Owns the active UI language at runtime. The initial value is resolved once at
 * i18n construction (deployer config → browser → English); this store mirrors
 * that and drives switching.
 *
 * In-memory only — CLAUDE.md forbids browser storage for app state. On reload
 * the locale reverts to the browser/deployer default, the friendly behaviour.
 *
 * `setLocale` is the single side-effecting entry point: it updates the
 * vue-i18n locale, the Pinia ref, and `<html lang>`/`dir`. `rdfLang` exposes the
 * primary subtag so the RDF-label layer can request literals in the same
 * language (see `useLabels` / `api/languages.ts`).
 */

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { i18n } from "@/i18n";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  matchSupportedLocale,
  primarySubtag,
} from "@/i18n/locales";

export const useLocaleStore = defineStore("locale", () => {
  // i18n.global.locale is a writable ref in Composition mode (legacy: false).
  const current = ref<string>(i18n.global.locale.value);

  /** Primary subtag of the active locale, for RDF-literal language preference. */
  const rdfLang = computed(() => primarySubtag(current.value));

  /** The active locale's metadata (label/dir), or the default's as a guard. */
  const meta = computed(
    () =>
      SUPPORTED_LOCALES.find((l) => l.code === current.value) ??
      SUPPORTED_LOCALES.find((l) => l.code === DEFAULT_LOCALE)!,
  );

  function setLocale(code: string) {
    const next = matchSupportedLocale(code) ?? DEFAULT_LOCALE;
    current.value = next;
    // `next` is a validated supported code; vue-i18n types `locale` as the
    // literal union inferred from the message bundles, so narrow it back.
    i18n.global.locale.value = next as typeof i18n.global.locale.value;
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.lang = next;
      root.dir = SUPPORTED_LOCALES.find((l) => l.code === next)?.dir ?? "ltr";
    }
  }

  return { current, rdfLang, meta, locales: SUPPORTED_LOCALES, setLocale };
});
