/**
 * Initial-locale resolution precedence: deployer config → browser → English,
 * and the tag-matching rules (exact, then primary subtag).
 */
import { afterEach, describe, expect, it } from "vitest";
import { matchSupportedLocale, resolveInitialLocale } from "./locales";

function setBrowserLang(value: string) {
  Object.defineProperty(navigator, "language", { value, configurable: true });
}
function setConfigLocale(value: string | undefined) {
  window.__FDP_CONFIG__ = value ? { defaultLocale: value } : {};
}

describe("matchSupportedLocale", () => {
  it("matches an exact supported tag case-insensitively", () => {
    expect(matchSupportedLocale("pt-BR")).toBe("pt-BR");
    expect(matchSupportedLocale("PT-br")).toBe("pt-BR");
    expect(matchSupportedLocale("de")).toBe("de");
  });

  it("matches by primary subtag when the exact tag is unsupported", () => {
    expect(matchSupportedLocale("pt-PT")).toBe("pt-BR");
    expect(matchSupportedLocale("en-US")).toBe("en");
    expect(matchSupportedLocale("de-AT")).toBe("de");
  });

  it("returns null for unsupported or empty tags", () => {
    expect(matchSupportedLocale("xx")).toBeNull();
    expect(matchSupportedLocale("")).toBeNull();
    expect(matchSupportedLocale(undefined)).toBeNull();
  });
});

describe("resolveInitialLocale", () => {
  const originalLang = navigator.language;
  afterEach(() => {
    setBrowserLang(originalLang);
    setConfigLocale(undefined);
  });

  it("prefers a supported deployer defaultLocale over the browser", () => {
    setConfigLocale("nl");
    setBrowserLang("fr-FR");
    expect(resolveInitialLocale()).toBe("nl");
  });

  it("ignores an unsupported defaultLocale and falls back to the browser", () => {
    setConfigLocale("xx");
    setBrowserLang("de-DE");
    expect(resolveInitialLocale()).toBe("de");
  });

  it("falls back to English when neither config nor browser matches", () => {
    setConfigLocale(undefined);
    setBrowserLang("ja-JP");
    expect(resolveInitialLocale()).toBe("en");
  });
});
