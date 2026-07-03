/**
 * Locale store: switching updates vue-i18n + <html lang/dir>, and `rdfLang`
 * exposes the primary subtag for RDF-literal coordination. Initial-resolution
 * precedence is covered in `src/i18n/locales.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "@/i18n";
import { useLocaleStore } from "./locale";

describe("locale store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    i18n.global.locale.value = "en";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });
  afterEach(() => {
    i18n.global.locale.value = "en";
  });

  it("mirrors the current i18n locale and derives rdfLang", () => {
    const store = useLocaleStore();
    store.setLocale("pt-BR");
    expect(store.current).toBe("pt-BR");
    expect(store.rdfLang).toBe("pt");
    expect(i18n.global.locale.value).toBe("pt-BR");
  });

  it("reflects the locale on <html lang> and dir", () => {
    const store = useLocaleStore();
    store.setLocale("de");
    expect(document.documentElement.lang).toBe("de");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("normalizes an unknown tag to the default locale", () => {
    const store = useLocaleStore();
    store.setLocale("xx-YY");
    expect(store.current).toBe("en");
  });

  it("matches a primary subtag to a supported variant (pt → pt-BR)", () => {
    const store = useLocaleStore();
    store.setLocale("pt");
    expect(store.current).toBe("pt-BR");
  });

  it("exposes the supported-locale catalog with endonyms", () => {
    const store = useLocaleStore();
    expect(store.locales.map((l) => l.code)).toContain("nl");
    expect(store.locales.find((l) => l.code === "de")?.label).toBe("Deutsch");
  });
});
