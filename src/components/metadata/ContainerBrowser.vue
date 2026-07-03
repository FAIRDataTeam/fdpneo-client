<script setup lang="ts">
/**
 * Overlay container tree — the "on-demand tree" promise of the C · Focus
 * layout. Triggered by the SecondaryNav's "Browse containers" button.
 *
 * Closes on Escape, click-outside, and after a node is selected.
 */
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useTree } from "@/composables/useTree";
import AppIcon from "@/components/shared/AppIcon.vue";
import TreeNode from "./TreeNode.vue";

const { t } = useI18n();

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const { data: tree, isLoading } = useTree();
const router = useRouter();
const overlayRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

function navigate(id: string) {
  void router.push(`/records/${id}`);
  emit("close");
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("keydown", onKeydown);
      requestAnimationFrame(() => panelRef.value?.querySelector<HTMLElement>(".node")?.focus());
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  },
);

onMounted(() => {
  if (props.open) document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => document.removeEventListener("keydown", onKeydown));

function onBackdropClick(e: MouseEvent) {
  if (e.target === overlayRef.value) emit("close");
}
</script>

<template>
  <div
    v-if="open"
    ref="overlayRef"
    class="overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="t('containerBrowser.ariaLabel')"
    @click="onBackdropClick"
  >
    <section ref="panelRef" class="panel">
      <header class="panel__head">
        <h2>{{ t("containerBrowser.heading") }}</h2>
        <button class="btn ghost sm" :aria-label="t('containerBrowser.close')" @click="emit('close')">
          <AppIcon name="x" :size="14" />
        </button>
      </header>
      <div v-if="isLoading" class="loading">{{ t("containerBrowser.loading") }}</div>
      <div v-else-if="tree" class="tree" role="tree">
        <TreeNode :node="tree" :depth="0" :active-path="['fdp']" @navigate="navigate" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 31, 0.36);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  z-index: 50;
}
.panel {
  width: min(360px, 90vw);
  max-height: 100vh;
  overflow: auto;
  background: var(--fair-surface);
  border-right: 1px solid var(--fair-separator);
  padding: 18px 14px 30px;
  box-shadow: var(--fair-shadow-2);
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 12px;
}
.panel__head h2 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
}
.loading {
  padding: 10px 8px;
  color: var(--fair-text-muted);
  font-size: 13px;
}
</style>
