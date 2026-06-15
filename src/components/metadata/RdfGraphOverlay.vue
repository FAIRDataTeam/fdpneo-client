<script setup lang="ts">
/**
 * Full-screen host for the live RDF graph. The sidecar is too narrow for the
 * force canvas, so the RdfPreviewPanel "Graph" chip opens it here. Mirrors the
 * ContainerBrowser overlay: Escape + backdrop close, focus on open, body scroll
 * lock. The graph's own toolbar carries the close button (emits `close`).
 */
import { onMounted, onUnmounted, ref, watch } from "vue";
import RdfGraphView from "./RdfGraphView.vue";

const props = defineProps<{ open: boolean; recordId: string; subjectIri: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

const overlayRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
function onBackdrop(e: MouseEvent) {
  if (e.target === overlayRef.value) emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("keydown", onKeydown);
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => panelRef.value?.focus());
    } else {
      document.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = "";
    }
  },
);
onMounted(() => {
  if (props.open) document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlayRef"
      class="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Record metadata graph"
      @click="onBackdrop"
    >
      <section ref="panelRef" class="panel" tabindex="-1">
        <RdfGraphView :record-id="recordId" :subject-iri="subjectIri" @close="emit('close')" />
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 32px;
  background: color-mix(in srgb, var(--ink) 38%, transparent);
  backdrop-filter: blur(3px);
}
.panel {
  width: min(1180px, 100%);
  height: min(760px, 100%);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-4, 18px);
  background: var(--surface);
  box-shadow: var(--shadow-2);
  overflow: hidden;
  outline: none;
  display: flex;
  flex-direction: column;
}
@media (max-width: 720px) {
  .overlay { padding: 0; }
  .panel { width: 100%; height: 100%; border-radius: 0; }
}
</style>
