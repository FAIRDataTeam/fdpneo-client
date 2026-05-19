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
import { useThemeStore } from "@/stores/theme";
import { usePrefersDark } from "@/composables/usePrefersDark";

const theme = useThemeStore();
const prefersDark = usePrefersDark();

watchEffect(() => theme.setSystemPrefersDark(prefersDark.value));
</script>

<template>
  <div class="shell">
    <AppHeader />
    <main class="main">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  color: var(--ink);
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
