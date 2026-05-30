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
import { useAuthStore } from "@/stores/auth";
import AppIcon from "./AppIcon.vue";

const auth = useAuthStore();
const router = useRouter();

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
  () => auth.user?.profile?.name || auth.user?.profile?.email || "Signed in",
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
      :aria-label="`User menu — ${displayName}`"
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
      <button v-if="auth.isSteward" class="item" role="menuitem" @click="gotoDashboard">
        <AppIcon name="book" :size="14" /> My metadata
      </button>
      <button class="item" role="menuitem" @click="signOut">
        <AppIcon name="x" :size="14" /> Sign out
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
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 12px;
  line-height: 1;
  border: 1px solid var(--accent-line);
  cursor: pointer;
  padding: 0;
}
.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  box-shadow: var(--shadow-2);
  padding: 6px;
  display: grid;
  gap: 2px;
  z-index: 30;
}
.identity {
  padding: 8px 10px 6px;
}
.identity__name {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--ink);
  line-height: 1.3;
}
.identity__email {
  font-size: 11px;
  color: var(--muted);
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
  border-radius: var(--r-1);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--ink-2);
  text-align: left;
  cursor: pointer;
}
.item:hover {
  background: var(--surface-2);
  color: var(--ink);
}
</style>
