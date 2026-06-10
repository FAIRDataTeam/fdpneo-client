<script setup lang="ts">
/**
 * About pop-up.
 *
 * A small modal surfacing the client version (inlined from package.json at
 * build time), the connected server's name + version (live from `GET /info`
 * via `useAppInfo`), and the project copyright. Triggered from the footer.
 *
 * Closes on Escape, backdrop click, and the close button — mirrors the
 * overlay-dialog pattern used elsewhere (e.g. ContainerBrowser).
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useAppInfo } from "@/composables/useAppInfo";
import AppIcon from "./AppIcon.vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const { data: info } = useAppInfo();

const clientVersion = __APP_VERSION__;
const serverVersion = computed(() => info.value?.version ?? null);
const serverName = computed(() => info.value?.name ?? "FAIR Data Point server");

const overlayRef = ref<HTMLElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) document.addEventListener("keydown", onKeydown);
    else document.removeEventListener("keydown", onKeydown);
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
    aria-labelledby="about-title"
    @click="onBackdropClick"
  >
    <section class="panel">
      <header class="panel__head">
        <h2 id="about-title">About</h2>
        <button class="btn ghost sm" aria-label="Close" @click="emit('close')">
          <AppIcon name="x" :size="14" />
        </button>
      </header>

      <div class="brand">
        <span class="brand__name">FAIR Data Point</span>
        <span class="brand__sub mono">reference web client</span>
      </div>

      <dl class="versions">
        <div class="row">
          <dt>Client</dt>
          <dd class="mono">v{{ clientVersion }}</dd>
        </div>
        <div class="row">
          <dt>Server</dt>
          <dd class="mono">
            <template v-if="serverVersion">{{ serverName }} · v{{ serverVersion }}</template>
            <span v-else class="muted">unavailable</span>
          </dd>
        </div>
      </dl>

      <p class="copyright">© FAIR Data Team</p>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 31, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.panel {
  width: min(380px, 90vw);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  padding: 18px 20px 22px;
  box-shadow: var(--shadow-2);
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.panel__head h2 {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.brand {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 16px;
}
.brand__name {
  font-family: var(--font-serif);
  font-size: 20px;
  color: var(--ink);
}
.brand__sub {
  font-size: 11px;
  color: var(--muted);
}
.versions {
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--line);
  padding-top: 8px;
}
.row dt {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.row dd {
  margin: 0;
  font-size: 13px;
  color: var(--ink);
  text-align: right;
}
.muted {
  color: var(--muted);
}
.copyright {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
</style>
