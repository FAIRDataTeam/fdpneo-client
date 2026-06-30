/**
 * The switcher lists every supported locale by endonym and, on selection,
 * drives the locale store (which updates vue-i18n). i18n is installed globally
 * in test-setup; Pinia is created per test.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "@/i18n";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { useLocaleStore } from "@/stores/locale";
import LanguageSwitcher from "./LanguageSwitcher.vue";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    i18n.global.locale.value = "en";
  });
  afterEach(() => {
    i18n.global.locale.value = "en";
  });

  it("opens a menu listing every supported locale by endonym", async () => {
    const wrapper = mount(LanguageSwitcher);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await wrapper.find("button").trigger("click");

    const items = wrapper.findAll('[role="menuitemradio"]');
    expect(items).toHaveLength(SUPPORTED_LOCALES.length);
    const labels = items.map((i) => i.text());
    for (const l of SUPPORTED_LOCALES) {
      expect(labels.some((t) => t.includes(l.label))).toBe(true);
    }
  });

  it("switches the locale when an item is chosen and closes the menu", async () => {
    const wrapper = mount(LanguageSwitcher);
    const store = useLocaleStore();

    await wrapper.find("button").trigger("click");
    const dutch = wrapper
      .findAll('[role="menuitemradio"]')
      .find((i) => i.text().includes("Nederlands"));
    expect(dutch).toBeTruthy();
    await dutch!.trigger("click");

    expect(store.current).toBe("nl");
    expect(i18n.global.locale.value).toBe("nl");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });

  it("marks the active locale as checked", async () => {
    const wrapper = mount(LanguageSwitcher);
    useLocaleStore().setLocale("fr");
    await wrapper.find("button").trigger("click");

    const checked = wrapper.findAll('[role="menuitemradio"]').filter((i) => i.attributes("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]!.text()).toContain("Français");
  });
});
