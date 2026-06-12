import { afterEach, describe, expect, it } from "vitest";
import { LANGUAGES, orderedLanguages } from "./languages";

function setBrowserLang(value: string) {
  Object.defineProperty(navigator, "language", { value, configurable: true });
}

describe("orderedLanguages", () => {
  const original = navigator.language;
  afterEach(() => setBrowserLang(original));

  it("puts the browser language first, then English", () => {
    setBrowserLang("fr-FR");
    const out = orderedLanguages();
    expect(out[0]?.code).toBe("fr");
    expect(out[1]?.code).toBe("en");
    expect(out).toHaveLength(LANGUAGES.length); // no duplicates
  });

  it("leads with English when the browser is English", () => {
    setBrowserLang("en-GB");
    const out = orderedLanguages();
    expect(out[0]?.code).toBe("en");
    expect(out.filter((l) => l.code === "en")).toHaveLength(1);
  });
});
