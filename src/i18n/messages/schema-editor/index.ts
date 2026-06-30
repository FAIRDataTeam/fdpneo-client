/**
 * Schema-editor (Contour) UI message bundles, composed under the `schemaEditor.*`
 * namespace of the app's single vue-i18n instance (see `src/i18n/index.ts`).
 *
 * The bundles are vendored verbatim from the standalone Contour editor (sibling
 * repo) and tag-normalized to the client's locale codes (`nl-NL→nl`, `es-ES→es`,
 * `de-DE→de`, `fr-FR→fr`; `en`/`pt-BR` already match). They keep Contour's own
 * shape — nested keys, `{name}` interpolation, and `{ one, other }` plural
 * objects — which the editor i18n shim resolves (see
 * `components/shacl-editor/.../useI18n`). `en` is the source of truth; typing the
 * map as `Record<EditorLocale, EditorMessages>` enforces key parity at compile
 * time (a missing key in any locale fails the build), and `i18n.spec`-style runtime
 * checks guard against extras/empties.
 */

import en from "./en";
import ptBR from "./pt-BR";
import nl from "./nl";
import es from "./es";
import de from "./de";
import fr from "./fr";

/** The structural contract every editor bundle must satisfy (mirrors `en`). */
export type EditorMessages = typeof en;

/** The client's supported locale codes (must match `src/i18n/locales.ts`). */
export type EditorLocale = "en" | "pt-BR" | "nl" | "es" | "de" | "fr";

export const editorMessages: Record<EditorLocale, EditorMessages> = {
  en,
  "pt-BR": ptBR,
  nl,
  es,
  de,
  fr,
};
