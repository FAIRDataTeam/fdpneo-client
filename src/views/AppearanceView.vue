<script setup lang="ts">
/**
 * Appearance editor — in-app authoring for deployer white-labeling.
 *
 * Branding (colors, logo, favicon, org name) is a *client* deployment concern,
 * not server domain state: it lives in `/config.js`, read at boot by
 * `runtimeBranding()`. So this editor deliberately does NOT persist anything to
 * the server (that would mix a look&feel concern into server settings). Instead
 * it:
 *   - previews edits live in the current session (`setBrandingPreview`), and
 *   - exports the resulting `branding` block (`brandingConfigSnippet`) for the
 *     deployer to bake into their `/config.js`.
 *
 * The preview is in-memory only and is cleared when you leave the page; nothing
 * survives a reload until it's written into the deployment's config.
 *
 * Color pickers are native `<input type="color">` (a platform primitive, not a
 * new dependency) paired with a text field so any CSS color string is accepted;
 * the swatch is a convenience for hex values.
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { runtimeBranding, type BrandingConfig } from "@/runtimeConfig";
import {
  BRANDABLE_TOKENS,
  BRANDABLE_TOKEN_LABELS,
  brandingConfigSnippet,
  brandingEnvValue,
  setBrandingPreview,
  validateBranding,
} from "@/composables/useBranding";
import AppLogo from "@/components/shared/AppLogo.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const orgName = ref("");
const logoUrl = ref("");
const logoUrlDark = ref("");
const faviconUrl = ref("");
const faviconUrlDark = ref("");

const light = reactive<Record<string, string>>(
  Object.fromEntries(BRANDABLE_TOKENS.map((t) => [t, ""])),
);
const dark = reactive<Record<string, string>>(
  Object.fromEntries(BRANDABLE_TOKENS.map((t) => [t, ""])),
);

// Pristine built-in token values, read once with the deployed branding sheet
// disabled. Used to decide which tokens to emit (only those that differ).
const lightDefault: Record<string, string> = {};
const darkDefault: Record<string, string> = {};

const hex6 = /^#[0-9a-f]{6}$/i;
function swatch(value: string): string {
  return hex6.test(value.trim()) ? value.trim() : "#888888";
}

/** Read the pristine (un-branded) light + dark token values without painting. */
function readDefaults(): void {
  const root = document.documentElement;
  const sheet = document.getElementById("fdp-branding") as HTMLStyleElement | null;
  const wasDark = root.classList.contains("theme-dark");
  const wasDisabled = sheet?.disabled ?? false;
  if (sheet) sheet.disabled = true; // ignore deployed overrides → pristine values

  root.classList.remove("theme-dark");
  let cs = getComputedStyle(root);
  for (const t of BRANDABLE_TOKENS) lightDefault[t] = cs.getPropertyValue(t).trim();

  root.classList.add("theme-dark");
  cs = getComputedStyle(root);
  for (const t of BRANDABLE_TOKENS) darkDefault[t] = cs.getPropertyValue(t).trim();

  if (!wasDark) root.classList.remove("theme-dark");
  if (sheet) sheet.disabled = wasDisabled;
}

/** Seed the form from the deployed config (form shows current effective values). */
function seed(): void {
  readDefaults();
  const b = runtimeBranding();
  orgName.value = b.orgName ?? "";
  logoUrl.value = b.logoUrl ?? "";
  logoUrlDark.value = b.logoUrlDark ?? "";
  faviconUrl.value = b.faviconUrl ?? "";
  faviconUrlDark.value = b.faviconUrlDark ?? "";
  for (const t of BRANDABLE_TOKENS) {
    light[t] = b.theme?.[t] ?? lightDefault[t] ?? "";
    dark[t] = b.themeDark?.[t] ?? darkDefault[t] ?? "";
  }
}

/** Tokens whose value differs from the pristine default (the ones worth emitting). */
function diffTokens(
  values: Record<string, string>,
  defaults: Record<string, string>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const t of BRANDABLE_TOKENS) {
    const v = values[t]?.trim();
    if (v && v !== defaults[t]) out[t] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const draft = computed<BrandingConfig>(() => {
  const d: BrandingConfig = {};
  if (orgName.value.trim()) d.orgName = orgName.value.trim();
  if (logoUrl.value.trim()) d.logoUrl = logoUrl.value.trim();
  if (logoUrlDark.value.trim()) d.logoUrlDark = logoUrlDark.value.trim();
  if (faviconUrl.value.trim()) d.faviconUrl = faviconUrl.value.trim();
  if (faviconUrlDark.value.trim()) d.faviconUrlDark = faviconUrlDark.value.trim();
  const theme = diffTokens(light, lightDefault);
  const themeDark = diffTokens(dark, darkDefault);
  if (theme) d.theme = theme;
  if (themeDark) d.themeDark = themeDark;
  return d;
});

type ExportFormat = "config" | "docker";
const format = ref<ExportFormat>("config");
const snippet = computed(() =>
  format.value === "docker" ? brandingEnvValue(draft.value) : brandingConfigSnippet(draft.value),
);

// Live validation so a mistake (e.g. a color missing its "#") is explained
// here instead of being silently dropped from the exported config.
const issues = computed(() => validateBranding(draft.value));

// Live preview while mounted. Not `immediate`, so seeding in onMounted is what
// first applies it; before that the deployed branding (from boot) stays in place.
watch(draft, (d) => setBrandingPreview(d), { deep: true });

onMounted(seed);
onUnmounted(() => setBrandingPreview(null)); // preview is page-scoped, never persisted

function resetToDeployed(): void {
  seed();
  setBrandingPreview(null);
}

const copied = ref(false);
async function copySnippet(): Promise<void> {
  try {
    await navigator.clipboard.writeText(snippet.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* clipboard blocked — the textarea is selectable as a fallback */
  }
}
</script>

<template>
  <main class="appearance">
    <header class="hero">
      <h1>Appearance</h1>
      <p class="sub">
        Customize this client's look &amp; feel — colors, logo, and favicon. This is
        a client deployment tool (no sign-in required): changes preview live below
        but nothing is saved to the server. When you're happy, copy the generated
        config into your deployment's <code>/config.js</code> to make it permanent.
      </p>
      <p class="notice">
        <AppIcon name="eye" :size="14" /> Previewing in this session only. Leaving
        this page or reloading reverts to the deployed branding.
      </p>
    </header>

    <div v-if="issues.length" class="issues" role="alert">
      <strong class="issues__head"><AppIcon name="x" :size="14" /> Configuration issues</strong>
      <ul class="issues__list">
        <li v-for="(issue, i) in issues" :key="i">{{ issue }}</li>
      </ul>
    </div>

    <div class="grid">
      <section class="panel" aria-labelledby="identity-h">
        <h2 id="identity-h">Identity</h2>
        <label class="field">
          <span class="field__label">Organisation name</span>
          <input v-model="orgName" type="text" placeholder="FAIR Data Point" />
        </label>
        <label class="field">
          <span class="field__label">Logo URL (light)</span>
          <input v-model="logoUrl" type="text" placeholder="/branding/logo.svg" />
        </label>
        <label class="field">
          <span class="field__label">Logo URL (dark)</span>
          <input v-model="logoUrlDark" type="text" placeholder="optional" />
        </label>
        <label class="field">
          <span class="field__label">Favicon URL (light)</span>
          <input v-model="faviconUrl" type="text" placeholder="falls back to logo" />
        </label>
        <label class="field">
          <span class="field__label">Favicon URL (dark)</span>
          <input v-model="faviconUrlDark" type="text" placeholder="optional" />
        </label>
        <p class="hint">
          Serve logos same-origin or as <code>data:</code> URIs to satisfy the
          <code>img-src</code> content-security policy.
        </p>
      </section>

      <section class="panel" aria-labelledby="colors-h">
        <h2 id="colors-h">Color scheme</h2>
        <div class="tokens">
          <div v-for="t in BRANDABLE_TOKENS" :key="t" class="token">
            <span class="token__label">{{ BRANDABLE_TOKEN_LABELS[t] }}</span>
            <input
              type="color"
              class="token__swatch"
              :value="swatch(light[t] ?? '')"
              :aria-label="`${BRANDABLE_TOKEN_LABELS[t]} color`"
              @input="light[t] = ($event.target as HTMLInputElement).value"
            />
            <input v-model="light[t]" type="text" class="token__hex mono" />
          </div>
        </div>

        <details class="dark">
          <summary>Dark theme overrides</summary>
          <p class="hint">
            Leave a value at its default to inherit; edit only the tokens that need
            a different value in dark mode.
          </p>
          <div class="tokens">
            <div v-for="t in BRANDABLE_TOKENS" :key="t" class="token">
              <span class="token__label">{{ BRANDABLE_TOKEN_LABELS[t] }}</span>
              <input
                type="color"
                class="token__swatch"
                :value="swatch(dark[t] ?? '')"
                :aria-label="`${BRANDABLE_TOKEN_LABELS[t]} color (dark)`"
                @input="dark[t] = ($event.target as HTMLInputElement).value"
              />
              <input v-model="dark[t]" type="text" class="token__hex mono" />
            </div>
          </div>
        </details>
      </section>

      <section class="panel preview" aria-labelledby="preview-h">
        <h2 id="preview-h">Preview</h2>
        <div class="preview__lockup"><AppLogo :size="28" /></div>
        <div class="preview__samples">
          <button type="button" class="sample-accent">Primary action</button>
          <span class="sample-signal">Signal badge</span>
          <div class="sample-surface">Surface card with <a href="#">a link</a>.</div>
        </div>
      </section>

      <section class="panel export" aria-labelledby="export-h">
        <div class="export__head">
          <h2 id="export-h">Export</h2>
          <div class="export__actions">
            <div class="seg" role="tablist" aria-label="Export format">
              <button
                type="button"
                class="seg__btn"
                role="tab"
                :aria-selected="format === 'config'"
                :class="{ 'seg__btn--on': format === 'config' }"
                @click="format = 'config'"
              >
                config.js
              </button>
              <button
                type="button"
                class="seg__btn"
                role="tab"
                :aria-selected="format === 'docker'"
                :class="{ 'seg__btn--on': format === 'docker' }"
                @click="format = 'docker'"
              >
                Docker env
              </button>
            </div>
            <button type="button" class="btn" @click="resetToDeployed">Reset</button>
            <button type="button" class="btn btn--primary" @click="copySnippet">
              <AppIcon name="code" :size="14" /> {{ copied ? "Copied" : "Copy" }}
            </button>
          </div>
        </div>
        <p class="hint">
          <template v-if="format === 'config'">
            For static hosting: merge this <code>branding</code> block into your
            deployment's <code>/config.js</code>.
          </template>
          <template v-else>
            For the container: set this <code>FDP_BRANDING</code> variable on the
            <strong>client</strong> service in your docker-compose. (Off-origin
            logos also need <code>FDP_BRANDING_IMG_ORIGIN</code> for the CSP.)
          </template>
        </p>
        <textarea
          class="export__code mono"
          readonly
          :value="snippet"
          :rows="format === 'docker' ? 4 : 14"
        ></textarea>
      </section>
    </div>
  </main>
</template>

<style scoped>
.appearance {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 28px 64px;
  width: 100%;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 24px;
}
.hero h1 {
  margin: 0 0 6px;
}
.sub {
  color: var(--muted);
  margin: 0;
  max-width: 70ch;
}
.notice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: var(--r-2);
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 13px;
}
.issues {
  margin-bottom: 20px;
  padding: 12px 16px;
  border: 1px solid var(--signal);
  border-radius: var(--r-2, 6px);
  background: var(--signal-soft);
  color: var(--ink);
}
.issues__head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--signal);
}
.issues__list {
  margin: 8px 0 0;
  padding-left: 22px;
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
.export {
  grid-column: 1 / -1;
}
@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.panel {
  border: 1px solid var(--accent-line);
  border-radius: var(--r-3, 10px);
  background: var(--surface);
  padding: 18px 20px;
}
.panel h2 {
  margin: 0 0 14px;
  font-size: 16px;
}
.field {
  display: block;
  margin-bottom: 12px;
}
.field__label {
  display: block;
  font-size: 13px;
  color: var(--ink-2);
  margin-bottom: 4px;
}
.field input,
.token__hex {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-2, 6px);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
}
.hint {
  font-size: 12px;
  color: var(--muted);
  margin: 8px 0 0;
}
.tokens {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.token {
  display: grid;
  grid-template-columns: 1fr 32px 110px;
  align-items: center;
  gap: 8px;
}
.token__label {
  font-size: 13px;
  color: var(--ink-2);
}
.token__swatch {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-2, 6px);
  background: none;
  cursor: pointer;
}
.token__hex {
  width: 110px;
  font-size: 12px;
}
.dark {
  margin-top: 14px;
}
.dark summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}
.preview__lockup {
  margin-bottom: 16px;
}
.preview__samples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.sample-accent {
  padding: 8px 14px;
  border: none;
  border-radius: var(--r-2, 6px);
  background: var(--accent);
  color: var(--paper);
  font: inherit;
  cursor: pointer;
}
.sample-signal {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--signal-soft);
  color: var(--signal);
  font-size: 13px;
  font-weight: 600;
}
.sample-surface {
  flex-basis: 100%;
  padding: 12px 14px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-2, 6px);
  background: var(--paper-deep);
  color: var(--ink);
  font-size: 14px;
}
.sample-surface a {
  color: var(--accent);
}
.export__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.export__head h2 {
  margin: 0;
}
.export__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.seg {
  display: inline-flex;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-2, 6px);
  overflow: hidden;
}
.seg__btn {
  padding: 6px 12px;
  border: none;
  background: var(--paper);
  color: var(--ink-2);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.seg__btn + .seg__btn {
  border-left: 1px solid var(--accent-line);
}
.seg__btn--on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-2, 6px);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.btn--primary {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}
.export__code {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--accent-line);
  border-radius: var(--r-2, 6px);
  background: var(--paper-deep);
  color: var(--ink);
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
}
</style>
