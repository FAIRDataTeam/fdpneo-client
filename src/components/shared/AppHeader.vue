<script setup lang="ts">
/**
 * Top-of-app header.
 *
 * Layout (left → right): FDP Neo lockup · deployment name/host · global search
 * (links to /search) · theme toggle · Sign-in or user avatar (+ Create when
 * authenticated).
 */
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { sampleDeployment } from "@/data/sampleRecord";
import AppLogo from "./AppLogo.vue";
import AppIcon from "./AppIcon.vue";
import ThemeToggle from "./ThemeToggle.vue";
import UserMenu from "./UserMenu.vue";

const router = useRouter();
const auth = useAuthStore();
const query = ref("");

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
      <div class="deployment__name">{{ sampleDeployment.name }}</div>
      <div class="deployment__host mono">{{ sampleDeployment.host }}</div>
    </div>
    <div class="spacer" />
    <form v-if="variant !== 'minimal'" class="search" role="search" @submit.prevent="submit">
      <AppIcon name="search" :size="15" color="var(--muted)" />
      <input
        v-model="query"
        aria-label="Search records, keywords, themes"
        placeholder="Search records, keywords, themes…"
      />
      <span class="kbd mono">⌘K</span>
    </form>
    <ThemeToggle />
    <button v-if="!auth.isAuthenticated" class="btn ghost" @click="startSignIn">
      Sign in
    </button>
    <template v-else>
      <button class="btn">
        <AppIcon name="plus" :size="14" /> Create
      </button>
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
</style>
