<script setup lang="ts">
/**
 * Top-of-app header.
 *
 * Layout (left → right): FDP Neo lockup · deployment name/host · global search
 * (links to /search) · theme toggle · Sign-in or user avatar (+ Create when
 * authenticated).
 */
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { apiBase } from "@/api/rdf";
import { useRepository } from "@/composables/useRepository";
import AppLogo from "./AppLogo.vue";
import AppIcon from "./AppIcon.vue";
import ThemeToggle from "./ThemeToggle.vue";
import UserMenu from "./UserMenu.vue";

const router = useRouter();
const auth = useAuthStore();
const config = useConfigStore();
const query = ref("");

// Deployment lockup: the title comes from the FDP repository (root) record's
// `dct:title`; the host is derived from the configured API base. Until the
// record resolves (or if it fails), fall back to a neutral label rather than
// flashing placeholder text.
const { data: repository } = useRepository();
const deploymentName = computed(() => repository.value?.title?.trim() || "FAIR Data Point");
const deploymentHost = computed(
  () => apiBase().replace(/^https?:\/\//, "") || window.location.host,
);

// Quick-create: a top-level catalog under the repository root. Only shown to
// users who can actually author (steward; admin implies steward).
const newCatalogLink = computed(
  () => `/create/catalog?parent=${encodeURIComponent(apiBase())}`,
);

function submit() {
  const q = query.value.trim();
  void router.push({ name: "search", query: q ? { q } : {} });
}

function startSignIn() {
  void auth.login(router.currentRoute.value.fullPath);
}

defineProps<{ variant?: "default" | "minimal" }>();
</script>

<template>
  <header>
    <RouterLink to="/" class="brand">
      <AppLogo />
    </RouterLink>
    <div class="deployment">
      <div class="deployment__name">{{ deploymentName }}</div>
      <div class="deployment__host mono">{{ deploymentHost }}</div>
    </div>
    <div class="spacer" />
    <div v-if="variant !== 'minimal' && config.isEnabled('search')" class="search-wrap">
      <form class="search" role="search" @submit.prevent="submit">
        <AppIcon name="search" :size="15" color="var(--muted)" />
        <input
          v-model="query"
          aria-label="Search records, keywords, themes"
          placeholder="Search records, keywords, themes…"
        />
        <span class="kbd mono">⌘K</span>
      </form>
      <RouterLink class="advanced-link" :to="{ name: 'advanced-search' }">Advanced search</RouterLink>
    </div>
    <ThemeToggle />
    <button v-if="!auth.isAuthenticated" class="btn ghost" @click="startSignIn">
      Sign in
    </button>
    <template v-else>
      <RouterLink v-if="auth.isSteward" :to="newCatalogLink" class="btn create-btn">
        <AppIcon name="plus" :size="14" /> Create
      </RouterLink>
      <UserMenu />
    </template>
  </header>
</template>

<style scoped>
header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  height: 64px;
  flex: none;
}
.brand {
  display: inline-flex;
  align-items: center;
}
.deployment {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 16px;
  border-left: 1px solid var(--line);
}
.deployment__name {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  color: var(--ink);
}
.deployment__host {
  font-size: 11px;
  line-height: 1;
  color: var(--muted);
}
.spacer {
  flex: 1;
}
.search-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}
.advanced-link {
  padding-left: 14px;
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 1;
  color: var(--muted);
  text-decoration: none;
}
.advanced-link:hover {
  color: var(--accent);
  text-decoration: underline;
}
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 360px;
  padding: 0 14px;
  height: 36px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 999px;
}
.search input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1;
  color: var(--ink);
}
.search input::placeholder {
  color: var(--muted);
}
.kbd {
  font-size: 11px;
  color: var(--muted-2);
}
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
</style>
