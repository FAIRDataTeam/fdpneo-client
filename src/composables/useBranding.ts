/**
 * useBranding — deployer white-labeling.
 *
 * A deployment can re-skin the whole client by setting `branding` in `/config.js`
 * (read via `runtimeBranding()`), without rebuilding the image. Because the design
 * is fully tokenized, overriding a curated set of CSS custom properties recolors
 * everything; a `logoUrl`/`orgName` swap the header lockup.
 *
 * Two entry points:
 *  - `applyBranding()` — a one-time boot side-effect (called from `main.ts` before
 *    mount) that injects the token overrides as a stylesheet.
 *  - `useBranding()` — reactive accessors (`orgName`, theme-aware `logoUrl`) for
 *    components.
 *
 * Overrides are applied as an injected `<style>` (a `:root` rule + a `.theme-dark`
 * rule), NOT inline styles on the root: inline styles beat the `.theme-dark`
 * selector and would leak light values into dark mode. A stylesheet mirrors how
 * `tokens.css` layers the two themes, so dark overrides win under `.theme-dark`
 * and light overrides win otherwise.
 */

import { computed } from "vue";
import { runtimeBranding } from "@/runtimeConfig";
import { useThemeStore } from "@/stores/theme";

/**
 * The brandable surface: only these CSS custom properties may be overridden.
 * Curated to the semantic colors that cascade across the whole UI — accent,
 * signal, the paper/surface grounds, and ink. Unknown keys are ignored.
 */
export const BRANDABLE_TOKENS: readonly string[] = [
  "--accent",
  "--accent-deep",
  "--accent-soft",
  "--accent-line",
  "--signal",
  "--signal-soft",
  "--paper",
  "--paper-deep",
  "--surface",
  "--ink",
];

const STYLE_ELEMENT_ID = "fdp-branding";

/** Serialize an allowlisted token map to CSS declarations (empty string if none). */
function declarations(overrides: Record<string, string> | undefined): string {
  if (!overrides) return "";
  return Object.entries(overrides)
    .filter(([key]) => BRANDABLE_TOKENS.includes(key))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

/**
 * Inject (or refresh) the branding stylesheet from the runtime `branding.theme`
 * and `branding.themeDark` overrides. Idempotent: replaces the existing element.
 * No-op when nothing is configured (and removes a stale element if present).
 */
export function applyBranding(): void {
  if (typeof document === "undefined") return;
  const { theme, themeDark } = runtimeBranding();

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

/** Reactive branding accessors for components. */
export function useBranding() {
  const theme = useThemeStore();
  const branding = runtimeBranding();

  const orgName = computed(() => branding.orgName?.trim() || null);

  const logoUrl = computed(() => {
    if (theme.resolvedTheme === "dark" && branding.logoUrlDark) return branding.logoUrlDark;
    return branding.logoUrl || null;
  });

  return { orgName, logoUrl };
}
