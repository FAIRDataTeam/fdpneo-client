import { describe, expect, it, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useThemeStore } from "./theme";

describe("theme store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.documentElement.classList.remove("theme-dark");
  });

  it("defaults to system and resolves via prefers-color-scheme", async () => {
    const t = useThemeStore();
    expect(t.mode).toBe("system");
    t.setSystemPrefersDark(true);
    await Promise.resolve();
    expect(t.resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
  });

  it("cycles system → light → dark → system", async () => {
    const t = useThemeStore();
    t.setSystemPrefersDark(false);
    await Promise.resolve();
    expect(t.mode).toBe("system");
    t.cycle();
    expect(t.mode).toBe("light");
    t.cycle();
    expect(t.mode).toBe("dark");
    t.cycle();
    expect(t.mode).toBe("system");
  });

  it("explicit light wins over system-prefers-dark", async () => {
    const t = useThemeStore();
    t.setSystemPrefersDark(true);
    t.setMode("light");
    await Promise.resolve();
    expect(t.resolvedTheme).toBe("light");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
  });
});
