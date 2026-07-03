<script setup lang="ts">
/**
 * Root shell.
 *
 * AppHeader (logo · deployment · search · theme · auth) → RouterView → AppFooter.
 * Per-view backgrounds (paper, surface) stay inside the view; the shell is a
 * neutral flex column that fills the viewport.
 *
 * The theme store reads OS `prefers-color-scheme` once at mount so the
 * "system" default reflects the user's environment.
 */
import { watchEffect } from "vue";
import { RouterView } from "vue-router";
import AppHeader from "@/components/shared/AppHeader.vue";
import AppFooter from "@/components/shared/AppFooter.vue";
import AppErrorBoundary from "@/components/shared/AppErrorBoundary.vue";
import { useThemeStore } from "@/stores/theme";
import { usePrefersDark } from "@/composables/usePrefersDark";
import { useBranding, applyFaviconFromLogo } from "@/composables/useBranding";

const theme = useThemeStore();
const prefersDark = usePrefersDark();
const { faviconUrl } = useBranding();

watchEffect(() => theme.setSystemPrefersDark(prefersDark.value));

// Drive the browser-tab favicon from the (theme-aware) branding favicon, which
// itself falls back to the logo and then the built-in /favicon.svg.
watchEffect(() => applyFaviconFromLogo(faviconUrl.value));
</script>

<template>
  <div class="shell" data-tool="fdp">
    <AppHeader />
    <main class="main">
      <AppErrorBoundary v-slot="{ remountKey }">
        <RouterView :key="remountKey" />
      </AppErrorBoundary>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--fair-bg);
  color: var(--fair-text-strong);
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
