/**
 * useBranding: deployer white-label overrides. `applyBranding()` injects an
 * allowlisted token stylesheet; `useBranding()` exposes org name + theme-aware
 * logo. Unknown token keys are ignored; absent branding is a no-op.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { applyBranding, applyFaviconFromLogo, useBranding } from "./useBranding";
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

describe("applyFaviconFromLogo", () => {
  function iconLink(): HTMLLinkElement {
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      link.setAttribute("type", "image/svg+xml");
      link.setAttribute("href", "/favicon.svg");
      document.head.appendChild(link);
    }
    return link;
  }

  beforeEach(() => {
    document.querySelector('link[rel~="icon"]')?.remove();
  });

  it("points the favicon at a configured SVG logo, keeping the svg type", () => {
    iconLink();
    applyFaviconFromLogo("/branding/logo.svg");

    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!;
    expect(link.getAttribute("href")).toBe("/branding/logo.svg");
    expect(link.getAttribute("type")).toBe("image/svg+xml");
  });

  it("drops the svg type for a non-SVG logo so it isn't mislabelled", () => {
    iconLink();
    applyFaviconFromLogo("/branding/logo.png");

    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!;
    expect(link.getAttribute("href")).toBe("/branding/logo.png");
    expect(link.hasAttribute("type")).toBe(false);
  });

  it("keeps the svg type for a data:image/svg+xml logo", () => {
    iconLink();
    applyFaviconFromLogo("data:image/svg+xml,<svg/>");

    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!;
    expect(link.getAttribute("type")).toBe("image/svg+xml");
  });

  it("restores the built-in favicon when no logo is configured", () => {
    iconLink();
    applyFaviconFromLogo("/branding/logo.png");
    applyFaviconFromLogo(null);

    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!;
    expect(link.getAttribute("href")).toBe("/favicon.svg");
    expect(link.getAttribute("type")).toBe("image/svg+xml");
  });

  it("no-ops when there is no icon link to update", () => {
    expect(() => applyFaviconFromLogo("/branding/logo.svg")).not.toThrow();
    expect(document.querySelector('link[rel~="icon"]')).toBeNull();
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

  it("falls back to the logo for the favicon when no favicon is configured", () => {
    setBranding({ logoUrl: "/light.svg", logoUrlDark: "/dark.svg" });
    const { faviconUrl } = useBranding();
    expect(faviconUrl.value).toBe("/light.svg");

    useThemeStore().setMode("dark");
    expect(faviconUrl.value).toBe("/dark.svg");
  });

  it("uses a dedicated favicon independent of the logo, with its own dark variant", () => {
    setBranding({
      logoUrl: "/logo.svg",
      faviconUrl: "/icon.svg",
      faviconUrlDark: "/icon-dark.svg",
    });
    const { faviconUrl, logoUrl } = useBranding();
    expect(faviconUrl.value).toBe("/icon.svg");
    expect(logoUrl.value).toBe("/logo.svg");

    useThemeStore().setMode("dark");
    expect(faviconUrl.value).toBe("/icon-dark.svg");
  });

  it("applies a light-only favicon in dark mode too (no dark variant)", () => {
    setBranding({ logoUrl: "/logo.svg", logoUrlDark: "/logo-dark.svg", faviconUrl: "/icon.svg" });
    const { faviconUrl } = useBranding();

    useThemeStore().setMode("dark");
    // Explicit favicon wins over the logo's dark variant.
    expect(faviconUrl.value).toBe("/icon.svg");
  });

  it("is null for the favicon when nothing is configured", () => {
    setBranding(undefined);
    expect(useBranding().faviconUrl.value).toBeNull();
  });
});
