<script setup lang="ts">
import { ref } from "vue";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import ContainerBrowser from "./ContainerBrowser.vue";

import type { Crumb } from "@/composables/useAncestors";

defineProps<{ breadcrumbs: Crumb[]; identifier: string }>();

const overlayOpen = ref(false);

async function copyIdentifier(id: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // copy failures don't need to interrupt the user
    }
  }
}
</script>

<template>
  <div class="nav">
    <button class="btn ghost sm" aria-label="Browse containers" @click="overlayOpen = true">
      <AppIcon name="tree" :size="14" /> Browse containers
    </button>
    <span class="dot" aria-hidden="true">·</span>
    <AppBreadcrumbs :items="breadcrumbs" />
    <div class="spacer" />
    <span class="id mono">{{ identifier.replace("https://", "") }}</span>
    <button class="btn ghost sm" aria-label="Copy identifier" @click="copyIdentifier(identifier)">
      <AppIcon name="link" :size="12" />
    </button>
  </div>
  <ContainerBrowser :open="overlayOpen" @close="overlayOpen = false" />
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 40px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  font-size: 13px;
}
.dot {
  color: var(--muted-2);
}
.spacer {
  flex: 1;
}
.id {
  font-size: 11px;
  color: var(--muted);
}
</style>
