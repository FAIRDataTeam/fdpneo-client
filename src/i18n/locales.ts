/**
 * Supported UI locales and the rules for picking one at startup.
 *
 * The UI language is distinct from RDF-literal language tags (see
 * `src/api/languages.ts`): this catalog drives which translation bundle the app
 * renders. Labels are endonyms (the language's own name) so the switcher reads
 * naturally regardless of the active locale.
 */

import { runtimeDefaultLocale } from "@/runtimeConfig";

export interface SupportedLocale {
  /** BCP-47 tag; also the vue-i18n message-bundle key. */
  code: string;
  /** The language's own name, shown in the switcher. */
  label: string;
  /** Text direction. All current locales are LTR; kept for future RTL locales. */
  dir: "ltr" | "rtl";
}

/** The locales shipped with the app. `en` is the source of truth and fallback. */
export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "pt-BR", label: "Português (Brasil)", dir: "ltr" },
  { code: "nl", label: "Nederlands", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
];

/** Fallback locale: used when nothing else matches and as vue-i18n's fallback. */
export const DEFAULT_LOCALE = "en";

/** Primary subtag, lower-cased: `"pt-BR" → "pt"`, `"en-US" → "en"`. */
export function primarySubtag(tag: string): string {
  return tag.split("-")[0]!.toLowerCase();
}

/**
 * Resolve an arbitrary BCP-47 tag to a supported locale code, or null.
 * Tries an exact (case-insensitive) match first, then a primary-subtag match
 * (so `"pt-PT"` and `"pt"` both land on `"pt-BR"`, the only Portuguese variant).
 */
export function matchSupportedLocale(tag: string | undefined | null): string | null {
  const norm = tag?.trim();
  if (!norm) return null;
  const exact = SUPPORTED_LOCALES.find((l) => l.code.toLowerCase() === norm.toLowerCase());
  if (exact) return exact.code;
  const sub = primarySubtag(norm);
  const byPrimary = SUPPORTED_LOCALES.find((l) => primarySubtag(l.code) === sub);
  return byPrimary ? byPrimary.code : null;
}

/**
 * Pick the locale to boot with. Precedence:
 *   1. deployer `defaultLocale` (`/config.js`),
 *   2. the browser's `navigator.language`,
 *   3. `DEFAULT_LOCALE`.
 * In-memory only — re-evaluated on every load (CLAUDE.md forbids storage).
 */
export function resolveInitialLocale(): string {
  return (
    matchSupportedLocale(runtimeDefaultLocale()) ||
    matchSupportedLocale(typeof navigator !== "undefined" ? navigator.language : null) ||
    DEFAULT_LOCALE
  );
}
