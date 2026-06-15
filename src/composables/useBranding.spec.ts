/**
 * useBranding: deployer white-label overrides. `applyBranding()` injects an
 * allowlisted token stylesheet; `useBranding()` exposes org name + theme-aware
 * logo. Unknown token keys are ignored; absent branding is a no-op.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { applyBranding, useBranding } from "./useBranding";
import { useThemeStore } from "@/stores/theme";
import type { BrandingConfig } from "@/runtimeConfig";

function setBranding(branding: BrandingConfig | undefined): void {
  window.__FDP_CONFIG__ = branding ? { branding } : {};
}

function brandingStyle(): HTMLStyleElement | null {
  return document.getElementById("fdp-branding") as HTMLStyleElement | null;
}

beforeEach(() => {
  setActivePinia(createPinia());
  setBranding(undefined);
  brandingStyle()?.remove();
});

describe("applyBranding", () => {
  it("injects allowlisted light + dark overrides and ignores unknown keys", () => {
    setBranding({
      theme: { "--accent": "#7a1f2b", "--nope": "#000" },
      themeDark: { "--accent": "#e08aa0" },
    });
    applyBranding();

    const css = brandingStyle()?.textContent ?? "";
    expect(css).toContain(":root {");
    expect(css).toContain("--accent: #7a1f2b;");
    expect(css).toContain(".theme-dark {");
    expect(css).toContain("--accent: #e08aa0;");
    // Non-allowlisted key dropped.
    expect(css).not.toContain("--nope");
  });

  it("is a no-op (and removes a stale element) when no theme overrides are set", () => {
    // Seed a stale element, then apply empty branding.
    setBranding({ theme: { "--accent": "#123456" } });
    applyBranding();
    expect(brandingStyle()).not.toBeNull();

    setBranding(undefined);
    applyBranding();
    expect(brandingStyle()).toBeNull();
  });
});

describe("useBranding", () => {
  it("exposes the org name, or null when unset", () => {
    setBranding({ orgName: "  Erasmus MC  " });
    expect(useBranding().orgName.value).toBe("Erasmus MC");

    setBranding(undefined);
    expect(useBranding().orgName.value).toBeNull();
  });

  it("prefers the dark logo variant under the dark theme", () => {
    setBranding({ logoUrl: "/light.svg", logoUrlDark: "/dark.svg" });
    const { logoUrl } = useBranding();
    expect(logoUrl.value).toBe("/light.svg");

    useThemeStore().setMode("dark");
    expect(logoUrl.value).toBe("/dark.svg");
  });
});
