<script setup lang="ts">
/**
 * UI-language switcher.
 *
 * A globe button that opens a small menu of supported locales (shown by their
 * endonyms). Picking one calls the locale store, which updates vue-i18n and
 * `<html lang>`. Mirrors `UserMenu`'s open/close behaviour: closes on Escape,
 * click-outside, or selection, and returns focus to the trigger.
 */
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLocaleStore } from "@/stores/locale";
import AppIcon from "./AppIcon.vue";

const { t } = useI18n();
const locale = useLocaleStore();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
  trigger.value?.focus();
}

function choose(code: string) {
  locale.setLocale(code);
  close();
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

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});
onMounted(() => {});
</script>

<template>
  <div ref="root" class="wrap">
    <button
      ref="trigger"
      class="btn ghost sm"
      :aria-label="t('language.switcherLabel')"
      :title="t('language.switcherLabel')"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <AppIcon name="globe" :size="14" />
    </button>
    <div v-if="open" class="menu" role="menu">
      <button
        v-for="l in locale.locales"
        :key="l.code"
        class="item"
        role="menuitemradio"
        :aria-checked="l.code === locale.current"
        @click="choose(l.code)"
      >
        <span class="check">
          <AppIcon v-if="l.code === locale.current" name="check" :size="13" />
        </span>
        {{ l.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}
.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: var(--fair-surface);
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  box-shadow: var(--fair-shadow-2);
  padding: 6px;
  display: grid;
  gap: 2px;
  z-index: 30;
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
  font-weight: 500;
  font-size: 13px;
  color: var(--fair-text);
  text-align: left;
  cursor: pointer;
}
.item:hover {
  background: var(--fair-highlight);
  color: var(--fair-text-strong);
}
.item[aria-checked="true"] {
  color: var(--fair-text-strong);
}
.check {
  width: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--tool-accent);
}
</style>
