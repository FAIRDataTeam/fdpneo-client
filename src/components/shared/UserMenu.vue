<script setup lang="ts">
/**
 * Authenticated-user dropdown.
 *
 * Anchored to the avatar in AppHeader. Opens on click, closes on Escape,
 * click-outside, or after a menu item is selected. Keeps focus on the trigger
 * after close so keyboard navigation is uninterrupted.
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import AppIcon from "./AppIcon.vue";

const { t } = useI18n();
const auth = useAuthStore();
const config = useConfigStore();
const router = useRouter();

/** Admin + the server's user-management facade is configured (ADR-0013). */
const canManageUsers = computed(() => auth.isAdmin && config.isEnabled("user_management"));

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);

const initials = computed(() => {
  const name = auth.user?.profile?.name || auth.user?.profile?.email || "";
  return (
    name
      .split(/[\s.@]+/)
      .map((p: string) => p[0]?.toUpperCase() ?? "")
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?"
  );
});

const displayName = computed(
  () => auth.user?.profile?.name || auth.user?.profile?.email || t("userMenu.signedIn"),
);
const displayEmail = computed(() => auth.user?.profile?.email ?? "");

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
  trigger.value?.focus();
}

async function gotoDashboard() {
  open.value = false;
  await router.push("/dashboard");
}

async function gotoResourceTypes() {
  open.value = false;
  await router.push("/admin/resource-definitions");
}

async function gotoSettings() {
  open.value = false;
  await router.push("/admin/settings");
}

async function gotoAppearance() {
  open.value = false;
  await router.push("/appearance");
}

async function gotoUsers() {
  open.value = false;
  await router.push("/admin/users");
}

async function gotoProfile() {
  open.value = false;
  await router.push("/account/profile");
}

async function gotoTokens() {
  open.value = false;
  await router.push("/account/tokens");
}

async function gotoLicenses() {
  open.value = false;
  await router.push("/licenses");
}

async function signOut() {
  open.value = false;
  await auth.logout();
}

function onDocumentClick(e: MouseEvent) {
  if (!open.value) return;
  if (root.value && !root.value.contains(e.target as Node)) close();
}
function onKeydown(e: KeyboardEvent) {
  if (open.value && e.key === "Escape") close();
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeydown);
  } else {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onKeydown);
  }
});

onMounted(() => {
  if (open.value) {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeydown);
  }
});
onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div ref="root" class="wrap">
    <button
      ref="trigger"
      class="avatar"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="t('userMenu.ariaLabel', { name: displayName })"
      @click="toggle"
    >
      {{ initials }}
    </button>
    <div v-if="open" class="menu" role="menu">
      <div class="identity">
        <div class="identity__name">{{ displayName }}</div>
        <div v-if="displayEmail" class="identity__email mono">{{ displayEmail }}</div>
      </div>
      <hr class="hr" />
      <!-- Schemas, Policies and Metrics live in the top nav (for signed-in users),
           so they're intentionally not repeated here — only the surfaces the tab
           bar doesn't carry stay in this menu. -->
      <button v-if="auth.isSteward" class="item" role="menuitem" @click="gotoDashboard">
        <AppIcon name="book" :size="14" /> {{ t("userMenu.myMetadata") }}
      </button>
      <button v-if="auth.isAdmin" class="item" role="menuitem" @click="gotoLicenses">
        <AppIcon name="book" :size="14" /> {{ t("userMenu.licenses") }}
      </button>
      <button v-if="auth.isAdmin" class="item" role="menuitem" @click="gotoResourceTypes">
        <AppIcon name="tree" :size="14" /> {{ t("userMenu.resourceTypes") }}
      </button>
      <button v-if="auth.isAdmin" class="item" role="menuitem" @click="gotoSettings">
        <AppIcon name="cog" :size="14" /> {{ t("userMenu.settings") }}
      </button>
      <button v-if="auth.isAdmin" class="item" role="menuitem" @click="gotoAppearance">
        <AppIcon name="eye" :size="14" /> {{ t("userMenu.appearance") }}
      </button>
      <button v-if="canManageUsers" class="item" role="menuitem" @click="gotoUsers">
        <AppIcon name="user" :size="14" /> {{ t("userMenu.users") }}
      </button>
      <button class="item" role="menuitem" @click="gotoProfile">
        <AppIcon name="user" :size="14" /> {{ t("userMenu.profile") }}
      </button>
      <button class="item" role="menuitem" @click="gotoTokens">
        <AppIcon name="lock" :size="14" /> {{ t("userMenu.accessTokens") }}
      </button>
      <button class="item" role="menuitem" @click="signOut">
        <AppIcon name="x" :size="14" /> {{ t("userMenu.signOut") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--fair-radius-pill);
  background: var(--tool-accent-tint);
  /* darker teal so the initials clear AA on the light accent tint */
  color: var(--fair-node-darker);
  display: grid;
  place-items: center;
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-semibold);
  font-size: var(--fair-text-sm);
  line-height: 1;
  border: 1px solid var(--fair-node-soft);
  cursor: pointer;
  padding: 0;
}
.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--fair-surface);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  box-shadow: var(--fair-shadow-3);
  padding: 6px;
  display: grid;
  gap: 2px;
  z-index: 30;
}
.identity {
  padding: 8px 10px 6px;
}
.identity__name {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-base);
  color: var(--fair-text-strong);
  line-height: 1.3;
}
.identity__email {
  font-size: var(--fair-text-xs);
  color: var(--fair-text-muted);
  margin-top: 2px;
}
.hr {
  margin: 4px 0;
}
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: var(--fair-radius-sm);
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-base);
  color: var(--fair-text);
  text-align: left;
  cursor: pointer;
}
.item:hover {
  background: var(--fair-highlight);
  color: var(--fair-text-strong);
}
</style>
