/**
 * The schema-editor i18n shim resolves Contour-style keys through the app's
 * single vue-i18n instance, follows the locale store, and handles `{one,other}`
 * plurals + `{param}` interpolation.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "@/i18n";
import { useLocaleStore } from "@/stores/locale";
import { useI18n } from "./useI18n";

describe("schema-editor i18n shim", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    i18n.global.locale.value = "en";
  });
  afterEach(() => {
    i18n.global.locale.value = "en";
  });

  it("resolves a namespaced editor key in the active locale", () => {
    const { t } = useI18n();
    expect(t("common.save")).toBe("Save");
  });

  it("follows the locale store when the language changes", () => {
    const store = useLocaleStore();
    const { t } = useI18n();
    store.setLocale("de");
    expect(t("common.save")).toBe("Speichern");
  });

  it("resolves { one, other } plurals by count with {n} interpolation", () => {
    const { plural } = useI18n();
    expect(plural("count.properties", 1)).toBe("1 property");
    expect(plural("count.properties", 3)).toBe("3 properties");
  });

  it("exposes the active locale reactively", () => {
    const store = useLocaleStore();
    const { locale } = useI18n();
    expect(locale.value).toBe("en");
    store.setLocale("fr");
    expect(locale.value).toBe("fr");
  });
});
