/**
 * Every message in every locale compiles.
 *
 * vue-i18n compiles a message the first time it renders, so a syntax error
 * (an unescaped `@`, `{`, `}` or `|`) only shows when that message is first
 * displayed — and then crashes the page (fdpneo-client 0.9.2: the "+ New user"
 * form died on "jdoe@org.example", compile error 10, invalid linked format).
 * Rendering every key here moves that failure to CI. Escape literal special
 * characters as `{'@'}`, `{'{'}`, `{'}'}` and `{'|'}`.
 */

import { describe, expect, it } from "vitest";
import { createI18n, type DefineLocaleMessage } from "vue-i18n";
import { i18n } from "@/i18n";

type Tree = { [key: string]: unknown };
type Messages = ReturnType<typeof i18n.global.getLocaleMessage>;

/** A standalone instance holding one locale's messages, with no fallback. */
function probeFor(locale: string, messages: Messages) {
  // The app instance hands messages back loosely typed; they are the same
  // objects it was created with.
  const all = { [locale]: messages } as Record<string, DefineLocaleMessage>;
  return createI18n({ legacy: false, locale, messages: all });
}

function leafKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? leafKeys(value as Tree, path)
      : [path];
  });
}

const locales = i18n.global.availableLocales;

describe("i18n messages", () => {
  it("covers all six locales", () => {
    expect([...locales].sort()).toEqual(["de", "en", "es", "fr", "nl", "pt-BR"]);
  });

  it.each(locales)("every %s message compiles and renders", (locale) => {
    const messages = i18n.global.getLocaleMessage(locale);
    // A fresh instance per locale: no fallback, so each message is compiled
    // from this locale's own text.
    const probe = probeFor(locale, messages);
    const broken: string[] = [];
    for (const key of leafKeys(messages)) {
      try {
        probe.global.t(key, { n: 1, count: 1 });
      } catch (error) {
        broken.push(`${key}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("renders the email placeholder literally", () => {
    const probe = probeFor("en", i18n.global.getLocaleMessage("en"));
    expect(probe.global.t("usersAdmin.emailPlaceholder")).toBe("jdoe@org.example");
  });
});
