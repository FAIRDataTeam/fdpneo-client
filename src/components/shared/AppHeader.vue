<script setup lang="ts">
/**
 * Top-of-app header (FAIR Ecosystem).
 *
 * Layout (left → right): FDP glyph + wordmark · primary tab nav
 * (Browse · Search · Schemas · Policies · Metrics) · global search pill · language
 * · theme · Sign-in or `+ New` + user avatar. Sticky. The deployment/org identity
 * is carried by the branded logo (useBranding) and the browse hero, not a header
 * host label.
 */
import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { apiBase } from "@/api/rdf";
import AppLogo from "./AppLogo.vue";
import AppIcon from "./AppIcon.vue";
import ThemeToggle from "./ThemeToggle.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import UserMenu from "./UserMenu.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const config = useConfigStore();
const query = ref("");

// Primary navigation. `family` lists the route names under each destination so
// the tab reads as active across a whole area (e.g. a record detail keeps Browse
// lit). Search/Metrics are feature-gated; Browse/Schemas/Policies always show.
interface Tab {
  key: string;
  label: string;
  to: { name: string };
  family: string[];
  show: boolean;
}
const tabs = computed<Tab[]>(() =>
  [
    {
      key: "browse",
      label: t("header.nav.browse"),
      to: { name: "browse" },
      family: [
        "browse",
        "record-detail",
        "record-edit",
        "entity-create",
        "repository-edit",
        "dashboard",
      ],
      show: true,
    },
    {
      key: "search",
      label: t("header.nav.search"),
      to: { name: "search" },
      family: ["search", "advanced-search", "sparql"],
      show: config.isEnabled("search"),
    },
    { key: "schemas", label: t("header.nav.schemas"), to: { name: "schemas" }, family: ["schemas"], show: true },
    {
      key: "policies",
      label: t("header.nav.policies"),
      to: { name: "policies" },
      family: ["policies", "licenses"],
      show: true,
    },
    {
      key: "metrics",
      label: t("header.nav.metrics"),
      to: { name: "metrics" },
      family: ["metrics"],
      show: config.isEnabled("metrics"),
    },
  ].filter((tab) => tab.show),
);

function isActive(tab: Tab): boolean {
  return tab.family.includes(String(route.name));
}

// Quick-create: a top-level catalog under the repository root. Only shown to
// users who can actually author (steward; admin implies steward).
const newCatalogLink = computed(() => `/create/catalog?parent=${encodeURIComponent(apiBase())}`);

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
      <AppLogo :show-neo="false" />
    </RouterLink>

    <nav v-if="variant !== 'minimal'" class="tabs" :aria-label="t('header.nav.ariaLabel')">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        class="tab"
        :class="{ active: isActive(tab) }"
        :aria-current="isActive(tab) ? 'page' : undefined"
        >{{ tab.label }}</RouterLink
      >
    </nav>

    <div class="spacer" />

    <div v-if="variant !== 'minimal' && config.isEnabled('search')" class="search-wrap">
      <form class="search" role="search" @submit.prevent="submit">
        <AppIcon name="search" :size="15" color="var(--fair-text-muted)" />
        <input
          v-model="query"
          :aria-label="t('header.searchAria')"
          :placeholder="t('header.searchPlaceholder')"
        />
        <span class="kbd mono">⌘K</span>
      </form>
    </div>
    <LanguageSwitcher />
    <ThemeToggle />
    <button v-if="!auth.isAuthenticated" class="btn ghost" @click="startSignIn">
      {{ t("header.signIn") }}
    </button>
    <template v-else>
      <RouterLink v-if="auth.isSteward" :to="newCatalogLink" class="btn create-btn">
        <AppIcon name="plus" :size="14" /> {{ t("header.create") }}
      </RouterLink>
      <UserMenu />
    </template>
  </header>
</template>

<style scoped>
header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 var(--fair-gutter);
  border-bottom: 1px solid var(--fair-border);
  background: var(--fair-surface);
  height: var(--fair-header-h);
  flex: none;
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand {
  display: inline-flex;
  align-items: center;
}

/* Primary tab nav — active tab underlined in the tool accent. */
.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
}
.tab {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
  margin: 0 8px;
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-base);
  color: var(--fair-text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: color var(--fair-transition);
}
.tab:hover {
  color: var(--fair-text-strong);
}
.tab.active {
  color: var(--fair-text-strong);
  border-bottom-color: var(--tool-accent);
}
.spacer {
  flex: 1;
}
.search-wrap {
  display: flex;
  align-items: center;
}
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 300px;
  padding: 0 14px;
  height: 36px;
  background: var(--fair-canvas);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-pill);
}
.search:focus-within {
  border-color: var(--tool-accent);
  box-shadow: var(--fair-focus-ring-accent);
}
.search input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: var(--fair-text-base);
  line-height: 1;
  color: var(--fair-text-strong);
}
.search input::placeholder {
  color: var(--fair-text-muted);
}
.kbd {
  font-size: var(--fair-text-xs);
  color: var(--fair-text-light);
}
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
</style>
