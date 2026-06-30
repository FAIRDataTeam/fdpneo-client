/**
 * vue-i18n singleton.
 *
 * Composition-API mode (`legacy: false`) — components consume messages via
 * `useI18n()`, matching the `<script setup>` convention. `en` is the fallback,
 * so a missing key in any locale degrades to English rather than showing the
 * raw key. The initial locale is resolved at module load (deployer config →
 * browser → English); the `locale` store owns runtime switching.
 *
 * `translate` / `hasMessage` are escape hatches for non-component `.ts` modules
 * (e.g. `api/errorMessages.ts`, `api/entityForms.ts`) that can't call
 * `useI18n()`.
 */

import { createI18n } from "vue-i18n";
import en from "./messages/en";
import ptBR from "./messages/pt-BR";
import nl from "./messages/nl";
import es from "./messages/es";
import de from "./messages/de";
import fr from "./messages/fr";
import { editorMessages } from "./messages/schema-editor";
import { DEFAULT_LOCALE, resolveInitialLocale } from "./locales";

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  // Fall back silently: a gap in a translation should show English, not warn.
  missingWarn: false,
  fallbackWarn: false,
  // Each locale carries the app shell's keys plus the vendored schema-editor
  // (Contour) strings under `schemaEditor.*` — one instance, one active locale.
  messages: {
    en: { ...en, schemaEditor: editorMessages.en },
    "pt-BR": { ...ptBR, schemaEditor: editorMessages["pt-BR"] },
    nl: { ...nl, schemaEditor: editorMessages.nl },
    es: { ...es, schemaEditor: editorMessages.es },
    de: { ...de, schemaEditor: editorMessages.de },
    fr: { ...fr, schemaEditor: editorMessages.fr },
  },
});

/** Translate from a non-component module. Mirrors `t()`'s named-interpolation form. */
export function translate(key: string, named?: Record<string, unknown>): string {
  return named ? i18n.global.t(key, named) : i18n.global.t(key);
}

/** Whether a message key exists in the active (or fallback) locale. */
export function hasMessage(key: string): boolean {
  return i18n.global.te(key);
}
