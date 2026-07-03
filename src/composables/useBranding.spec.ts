/**
 * useBranding: deployer white-label overrides. `applyBranding()` injects an
 * allowlisted token stylesheet; `useBranding()` exposes org name + theme-aware
 * logo. Unknown token keys are ignored; absent branding is a no-op.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
  applyBranding,
  applyFaviconFromLogo,
  brandingConfigSnippet,
  brandingEnvValue,
  brandingPreviewActive,
  setBrandingPreview,
  useBranding,
  validateBranding,
} from "./useBranding";
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
  setBrandingPreview(null);
  brandingStyle()?.remove();
});

describe("applyBranding", () => {
  it("injects allowlisted light + dark overrides and ignores unknown keys", () => {
    setBranding({
      theme: { "--tool-accent": "#7a1f2b", "--nope": "#000" },
      themeDark: { "--tool-accent": "#e08aa0" },
    });
    applyBranding();

    const css = brandingStyle()?.textContent ?? "";
    expect(css).toContain(":root {");
    expect(css).toContain("--tool-accent: #7a1f2b;");
    expect(css).toContain(".theme-dark {");
    expect(css).toContain("--tool-accent: #e08aa0;");
    // Non-allowlisted key dropped.
    expect(css).not.toContain("--nope");
  });

  it("is a no-op (and removes a stale element) when no theme overrides are set", () => {
    // Seed a stale element, then apply empty branding.
    setBranding({ theme: { "--tool-accent": "#123456" } });
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

describe("setBrandingPreview", () => {
  it("overlays a draft as the active branding and clears back to deployed", () => {
    setBranding({ theme: { "--tool-accent": "#deployed" } });
    applyBranding();
    expect(brandingStyle()?.textContent).toContain("--tool-accent: #deployed;");
    expect(brandingPreviewActive.value).toBe(false);

    setBrandingPreview({ theme: { "--tool-accent": "#preview" } });
    expect(brandingPreviewActive.value).toBe(true);
    expect(brandingStyle()?.textContent).toContain("--tool-accent: #preview;");
    // The preview replaces the deployed overrides for the session.
    expect(brandingStyle()?.textContent).not.toContain("#deployed");

    setBrandingPreview(null);
    expect(brandingPreviewActive.value).toBe(false);
    expect(brandingStyle()?.textContent).toContain("--tool-accent: #deployed;");
  });

  it("makes useBranding accessors reflect the live preview", () => {
    setBranding({ logoUrl: "/deployed.svg" });
    const { logoUrl } = useBranding();
    expect(logoUrl.value).toBe("/deployed.svg");

    setBrandingPreview({ logoUrl: "/preview.svg" });
    expect(logoUrl.value).toBe("/preview.svg");
  });
});

describe("brandingConfigSnippet", () => {
  it("emits a minimal, valid branding block and drops empties + unknown tokens", () => {
    const snippet = brandingConfigSnippet({
      orgName: "  Erasmus MC  ",
      logoUrl: " /logo.svg ",
      logoUrlDark: "   ",
      theme: { "--tool-accent": " #7a1f2b ", "--nope": "#000", "--blank": "  " },
      themeDark: {},
    });

    expect(snippet).toContain("window.__FDP_CONFIG__");
    expect(snippet).toContain("branding:");
    expect(snippet).toContain('"orgName": "Erasmus MC"');
    expect(snippet).toContain('"logoUrl": "/logo.svg"');
    expect(snippet).toContain('"--tool-accent": "#7a1f2b"');
    // Dropped: empty logoUrlDark, unknown/blank tokens, empty themeDark.
    expect(snippet).not.toContain("logoUrlDark");
    expect(snippet).not.toContain("--nope");
    expect(snippet).not.toContain("--blank");
    expect(snippet).not.toContain("themeDark");

    // The emitted object is valid JSON (and thus valid JS): the slice between the
    // `branding:` key and the trailing `,` parses back to the cleaned config.
    const start = snippet.indexOf("branding:") + "branding:".length;
    const end = snippet.lastIndexOf(",\n};");
    const parsed = JSON.parse(snippet.slice(start, end).trim()) as BrandingConfig;
    expect(parsed.orgName).toBe("Erasmus MC");
    expect(parsed.theme?.["--tool-accent"]).toBe("#7a1f2b");
  });

  it("emits a single-line FDP_BRANDING env var of valid JSON", () => {
    const line = brandingEnvValue({
      orgName: "Acme",
      logoUrl: "  ",
      theme: { "--tool-accent": "#7a1f2b", "--nope": "#000" },
    });

    expect(line.startsWith("FDP_BRANDING='")).toBe(true);
    expect(line.endsWith("'")).toBe(true);
    expect(line).not.toContain("\n");

    const json = line.slice("FDP_BRANDING='".length, -1);
    const parsed = JSON.parse(json) as BrandingConfig;
    expect(parsed.orgName).toBe("Acme");
    expect(parsed.theme?.["--tool-accent"]).toBe("#7a1f2b");
    expect(parsed.logoUrl).toBeUndefined(); // blank dropped
    expect(parsed.theme?.["--nope"]).toBeUndefined(); // non-allowlisted dropped
  });
});

describe("validateBranding", () => {
  it("returns no issues for a clean config (and for null/empty)", () => {
    expect(validateBranding(undefined)).toEqual([]);
    expect(validateBranding({})).toEqual([]);
    expect(
      validateBranding({
        orgName: "Acme",
        logoUrl: "/logo.svg",
        theme: { "--tool-accent": "#2d5b89", "--fair-warning": "rgb(45 91 137)" },
      }),
    ).toEqual([]);
  });

  it("flags a non-object branding value", () => {
    expect(validateBranding("nope")[0]).toMatch(/must be an object/);
    expect(validateBranding([])[0]).toMatch(/must be an object/);
  });

  it("explains an unknown top-level key (likely a typo)", () => {
    const issues = validateBranding({ logoURL: "/logo.svg" }); // wrong case
    expect(issues.some((i) => i.includes('Unknown branding key "logoURL"'))).toBe(true);
  });

  it("explains an unknown / non-customizable theme token", () => {
    const issues = validateBranding({ theme: { "--accnt": "#fff" } }); // typo
    expect(issues.some((i) => i.includes('token "--accnt"'))).toBe(true);
  });

  it("explains a color value that doesn't look like a CSS color", () => {
    const issues = validateBranding({ theme: { "--tool-accent": "ff0000" } }); // missing #
    expect(issues.some((i) => i.includes("doesn't look like a CSS color"))).toBe(true);
  });

  it("flags wrong value types", () => {
    expect(validateBranding({ orgName: 5 })[0]).toMatch(/must be a string/);
    expect(validateBranding({ theme: "x" })[0]).toMatch(/must be an object/);
    expect(validateBranding({ theme: { "--tool-accent": 1 } })[0]).toMatch(/must be a string color/);
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
