<script setup lang="ts">
/**
 * Surfaces what the FDP metrics API does NOT track, per architecture §11
 * and ADR-0002. Click reveals the full list; the inline icon is the always-
 * visible hint.
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();
const open = ref(false);
</script>

<template>
  <div class="wrap">
    <button
      type="button"
      class="trigger"
      :aria-expanded="open"
      aria-controls="privacy-body"
      @click="open = !open"
    >
      <AppIcon name="shield" :size="13" /> {{ t("metrics.privacyTrigger") }}
      <AppIcon :name="open ? 'chevron-d' : 'chevron-r'" :size="11" />
    </button>
    <div v-if="open" id="privacy-body" class="body">
      <i18n-t keypath="metrics.privacyIntro" tag="p" scope="global">
        <template #strongNot><strong>{{ t("metrics.privacyNot") }}</strong></template>
      </i18n-t>
      <ul>
        <li>{{ t("metrics.privacyItem1") }}</li>
        <li>{{ t("metrics.privacyItem2") }}</li>
        <li>{{ t("metrics.privacyItem3") }}</li>
        <li>{{ t("metrics.privacyItem4") }}</li>
      </ul>
      <p class="muted">
        {{ t("metrics.privacyNote") }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  background: transparent;
  border: 1px solid var(--fair-separator);
  border-radius: 999px;
  font: 500 12px/1 var(--fair-font-sans);
  color: var(--fair-text);
  cursor: pointer;
}
.trigger:hover {
  background: var(--fair-highlight);
}
.body {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  padding: 14px 16px;
  background: var(--fair-surface);
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  box-shadow: var(--fair-shadow-2);
  z-index: 20;
  font-family: var(--fair-font-sans);
  font-size: 12px;
  line-height: 1.55;
  color: var(--fair-text);
}
.body p {
  margin: 0 0 8px;
}
.body ul {
  margin: 0 0 8px;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
.body .muted {
  color: var(--fair-text-muted);
}
</style>
