/**
 * useBranding — deployer white-labeling.
 *
 * A deployment can re-skin the whole client by setting `branding` in `/config.js`
 * (read via `runtimeBranding()`), without rebuilding the image. Because the design
 * is fully tokenized, overriding a curated set of CSS custom properties recolors
 * everything; a `logoUrl`/`orgName` swap the header lockup.
 *
 * Entry points:
 *  - `applyBranding()` — a one-time boot side-effect (called from `main.ts` before
 *    mount) that injects the token overrides as a stylesheet.
 *  - `useBranding()` — reactive accessors (`orgName`, theme-aware `logoUrl`) for
 *    components.
 *  - `setBrandingPreview()` — the in-app Appearance editor's live preview. It
 *    overlays a *draft* `BrandingConfig` on top of the deployed one for the
 *    current session only (in-memory, never persisted — branding is a client
 *    deployment concern that lives in `/config.js`, not server state). The editor
 *    exports the draft via `brandingConfigSnippet()` for the deployer to bake in.
 *
 * Overrides are applied as an injected `<style>` (a `:root` rule + a `.theme-dark`
 * rule), NOT inline styles on the root: inline styles beat the `.theme-dark`
 * selector and would leak light values into dark mode. A stylesheet mirrors how
 * `tokens.css` layers the two themes, so dark overrides win under `.theme-dark`
 * and light overrides win otherwise.
 */

import { computed, ref } from "vue";
import { runtimeBranding, type BrandingConfig } from "@/runtimeConfig";
import { useThemeStore } from "@/stores/theme";

/**
 * A session-only draft overlaid on the deployed branding by the Appearance
 * editor's live preview. `null` means "no preview — use the deployed config".
 * Reactive so `useBranding()` accessors and the favicon track preview edits.
 */
const previewOverride = ref<BrandingConfig | null>(null);

/** The branding currently in effect: the live-preview draft if any, else deployed. */
function activeBranding(): BrandingConfig {
  return previewOverride.value ?? runtimeBranding();
}

/**
 * The brandable surface: only these CSS custom properties may be overridden.
 * Curated to the semantic colors that cascade across the whole UI — accent,
 * signal, the paper/surface grounds, and ink. Unknown keys are ignored.
 */
export const BRANDABLE_TOKENS: readonly string[] = [
  "--tool-accent",
  "--fair-node-darker",
  "--tool-accent-tint",
  "--fair-node-soft",
  "--fair-warning",
  "--fair-warning-tint",
  "--fair-bg",
  "--fair-canvas",
  "--fair-surface",
  "--fair-text-strong",
];

/** Human-readable labels for the brandable tokens, for the Appearance editor UI. */
export const BRANDABLE_TOKEN_LABELS: Readonly<Record<string, string>> = {
  "--tool-accent": "Accent",
  "--fair-node-darker": "Accent (deep)",
  "--tool-accent-tint": "Accent (soft)",
  "--fair-node-soft": "Accent (line)",
  "--fair-warning": "Signal",
  "--fair-warning-tint": "Signal (soft)",
  "--fair-bg": "Background",
  "--fair-canvas": "Background (sunken)",
  "--fair-surface": "Surface",
  "--fair-text-strong": "Text",
};

const STYLE_ELEMENT_ID = "fdp-branding";

/** The built-in favicon shipped in `public/`; the fallback when no logo is configured. */
const DEFAULT_FAVICON = "/favicon.svg";

/** Serialize an allowlisted token map to CSS declarations (empty string if none). */
function declarations(overrides: Record<string, string> | undefined): string {
  if (!overrides) return "";
  return Object.entries(overrides)
    .filter(([key]) => BRANDABLE_TOKENS.includes(key))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

/**
 * Inject (or refresh) the branding stylesheet from the active `branding.theme`
 * and `branding.themeDark` overrides. Idempotent: replaces the existing element.
 * No-op when nothing is configured (and removes a stale element if present).
 */
export function applyBranding(): void {
  if (typeof document === "undefined") return;
  const { theme, themeDark } = activeBranding();

  const light = declarations(theme);
  const dark = declarations(themeDark);

  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (!light && !dark) {
    existing?.remove();
    return;
  }

  const rules: string[] = [];
  if (light) rules.push(`:root {\n${light}\n}`);
  // The `.theme-dark` rule follows `:root` so it wins under dark mode (equal
  // specificity, later source order) — same layering as tokens.css.
  if (dark) rules.push(`.theme-dark {\n${dark}\n}`);

  const el = existing ?? document.createElement("style");
  el.id = STYLE_ELEMENT_ID;
  el.textContent = rules.join("\n");
  if (!existing) document.head.appendChild(el);
}

/**
 * Live-preview a draft branding for the current session (Appearance editor).
 * Pass a draft to overlay it on the deployed config and re-apply the stylesheet;
 * pass `null` to clear the preview and revert to the deployed branding. The
 * favicon and `useBranding()` accessors update reactively (they read the same
 * `previewOverride`). Nothing is persisted — the editor exports the draft for
 * `/config.js` instead.
 */
export function setBrandingPreview(draft: BrandingConfig | null): void {
  previewOverride.value = draft;
  applyBranding();
}

/** Whether a live preview is currently overlaid on the deployed branding. */
export const brandingPreviewActive = computed(() => previewOverride.value !== null);

/**
 * Normalize a draft to the minimal, valid branding object: drop empty fields
 * and non-allowlisted tokens. Shared by the export serializers below.
 */
export function cleanBranding(draft: BrandingConfig): BrandingConfig {
  const clean: BrandingConfig = {};
  if (draft.orgName?.trim()) clean.orgName = draft.orgName.trim();
  if (draft.logoUrl?.trim()) clean.logoUrl = draft.logoUrl.trim();
  if (draft.logoUrlDark?.trim()) clean.logoUrlDark = draft.logoUrlDark.trim();
  if (draft.faviconUrl?.trim()) clean.faviconUrl = draft.faviconUrl.trim();
  if (draft.faviconUrlDark?.trim()) clean.faviconUrlDark = draft.faviconUrlDark.trim();

  const theme = pickTokens(draft.theme);
  const themeDark = pickTokens(draft.themeDark);
  if (theme) clean.theme = theme;
  if (themeDark) clean.themeDark = themeDark;
  return clean;
}

/**
 * Serialize a draft to a ready-to-paste `/config.js` snippet — the minimal,
 * valid `branding` block a deployer drops into their deployment's config (for
 * static hosting, or when not using the container's env-var path).
 */
export function brandingConfigSnippet(draft: BrandingConfig): string {
  // JSON is valid JS object syntax; re-indent so it nests cleanly under `branding`.
  const body = JSON.stringify(cleanBranding(draft), null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : "  " + line))
    .join("\n");

  return `// FDPneo branding — generated by the in-app Appearance editor.
// Merge the \`branding\` key into your deployment's /config.js, keeping the
// existing apiUrl / publicOrigin values for your environment.
window.__FDP_CONFIG__ = {
  branding: ${body},
};
`;
}

/**
 * Serialize a draft to the `FDP_BRANDING` env var line for the client service
 * of a docker-compose file. The container entrypoint injects it into
 * `/config.js` at start-up (see `deploy/docker-entrypoint.d/40-fdp-config.sh`),
 * so one image serves any branding. Single-quoted compact JSON (no inner single
 * quotes are produced by JSON.stringify), ready to paste under `environment:`.
 */
export function brandingEnvValue(draft: BrandingConfig): string {
  return `FDP_BRANDING='${JSON.stringify(cleanBranding(draft))}'`;
}

/** The recognized top-level branding keys (anything else is a typo and ignored). */
export const KNOWN_BRANDING_KEYS: readonly string[] = [
  "orgName",
  "logoUrl",
  "logoUrlDark",
  "faviconUrl",
  "faviconUrlDark",
  "theme",
  "themeDark",
];

const STRING_BRANDING_KEYS = [
  "orgName",
  "logoUrl",
  "logoUrlDark",
  "faviconUrl",
  "faviconUrlDark",
] as const;

/**
 * Heuristic CSS-color check — catches the common mistakes (missing `#`, stray
 * spaces, a number where a color was meant) without a full CSS parser. Accepts
 * hex, functional notations (rgb/hsl/lab/oklch/…), `var(...)`, and bare words
 * (named colors / `currentColor`).
 */
function looksLikeColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return (
    /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ||
    /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/i.test(v) ||
    /^var\(\s*--/i.test(v) ||
    /^[a-z]+$/i.test(v)
  );
}

/**
 * Validate a branding config and return human-readable issues (empty = clean).
 * Used to give the deployer explanatory feedback when `/config.js` /
 * `FDP_BRANDING` contains a mistake — at boot (console) and live in the
 * Appearance editor — rather than silently ignoring the bad value. Accepts
 * `unknown` because the input is deployer-authored and may be malformed.
 */
export function validateBranding(branding: unknown): string[] {
  const issues: string[] = [];
  if (branding == null) return issues;
  if (typeof branding !== "object" || Array.isArray(branding)) {
    return ['branding must be an object, e.g. { "orgName": "…", "theme": { … } }.'];
  }
  const b = branding as Record<string, unknown>;

  for (const key of Object.keys(b)) {
    if (!KNOWN_BRANDING_KEYS.includes(key)) {
      issues.push(
        `Unknown branding key "${key}" is ignored. Valid keys: ${KNOWN_BRANDING_KEYS.join(", ")}.`,
      );
    }
  }
  for (const key of STRING_BRANDING_KEYS) {
    if (key in b && typeof b[key] !== "string") {
      issues.push(`branding.${key} must be a string (a URL or name).`);
    }
  }
  for (const mapKey of ["theme", "themeDark"] as const) {
    if (!(mapKey in b)) continue;
    const map = b[mapKey];
    if (typeof map !== "object" || map === null || Array.isArray(map)) {
      issues.push(`branding.${mapKey} must be an object of CSS custom properties.`);
      continue;
    }
    for (const [token, value] of Object.entries(map as Record<string, unknown>)) {
      if (!BRANDABLE_TOKENS.includes(token)) {
        issues.push(
          `branding.${mapKey} token "${token}" is not customizable and is ignored. ` +
            `Allowed: ${BRANDABLE_TOKENS.join(", ")}.`,
        );
      } else if (typeof value !== "string") {
        issues.push(`branding.${mapKey}["${token}"] must be a string color value.`);
      } else if (!looksLikeColor(value)) {
        issues.push(
          `branding.${mapKey}["${token}"] value "${value}" doesn't look like a CSS color ` +
            `(expected e.g. "#2d5b89", "rgb(45 91 137)", or a named color).`,
        );
      }
    }
  }
  return issues;
}

/** Allowlist a token map, dropping empties; returns undefined when nothing remains. */
function pickTokens(tokens: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!tokens) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (BRANDABLE_TOKENS.includes(key) && value.trim()) out[key] = value.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Point the browser-tab favicon at the deployer's logo when one is configured,
 * else restore the built-in `/favicon.svg`. Updates the existing
 * `<link rel="icon">` in place (idempotent — no-ops when the href is unchanged).
 *
 * The `type` is derived from the href so a PNG/ICO logo isn't mislabelled as the
 * SVG the default link declares: SVG (by extension or `data:` MIME) keeps
 * `image/svg+xml`; anything else drops the attribute and lets the browser sniff.
 *
 * Pass the theme-aware `logoUrl` from `useBranding()` so the favicon follows the
 * same light/dark variant as the header lockup.
 */
export function applyFaviconFromLogo(logoUrl: string | null): void {
  if (typeof document === "undefined") return;
  const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) return;

  const href = logoUrl || DEFAULT_FAVICON;
  if (link.getAttribute("href") === href) return;
  link.setAttribute("href", href);

  const isSvg = /\.svg(?:[?#]|$)/i.test(href) || href.startsWith("data:image/svg+xml");
  if (isSvg) link.setAttribute("type", "image/svg+xml");
  else link.removeAttribute("type");
}

/** Reactive branding accessors for components. Tracks live preview edits. */
export function useBranding() {
  const theme = useThemeStore();

  const orgName = computed(() => activeBranding().orgName?.trim() || null);

  const logoUrl = computed(() => {
    const branding = activeBranding();
    if (theme.resolvedTheme === "dark" && branding.logoUrlDark) return branding.logoUrlDark;
    return branding.logoUrl || null;
  });

  // The browser-tab favicon. Prefers the dedicated `favicon*` keys, then falls
  // back to the header logo so a single configured logo still drives the tab
  // icon (and the built-in default when nothing is set). An explicit favicon
  // wins over the logo in both themes; a light-only favicon also applies in dark
  // unless `faviconUrlDark` overrides it.
  const faviconUrl = computed(() => {
    const branding = activeBranding();
    const dark = theme.resolvedTheme === "dark";
    if (dark && branding.faviconUrlDark) return branding.faviconUrlDark;
    if (branding.faviconUrl) return branding.faviconUrl;
    return logoUrl.value;
  });

  return { orgName, logoUrl, faviconUrl };
}
