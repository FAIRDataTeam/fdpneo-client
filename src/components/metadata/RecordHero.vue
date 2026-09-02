<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { FdpRecord } from "@/data/sampleRecord";
import TypeTag from "@/components/shared/TypeTag.vue";
import AppChip from "@/components/shared/AppChip.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const { t } = useI18n();

defineProps<{ record: FdpRecord }>();
</script>

<template>
  <header class="hero">
    <div class="chips">
      <TypeTag :kind="record.type">{{ record.typeLabel }}</TypeTag>
      <AppChip variant="ok" dot>{{ t("recordHero.openMetadata") }}</AppChip>
      <AppChip>
        <AppIcon name="shield" :size="11" /> {{ t("recordHero.filesDua") }}
      </AppChip>
      <span class="version mono">v{{ record.version }}</span>
    </div>
    <h1>{{ record.title }}</h1>
    <p class="lede">{{ record.description }}</p>
  </header>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
}
.chips {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.version {
  font-size: var(--fair-text-xs);
  color: var(--fair-text-muted);
}
h1 {
  margin: 0 0 10px;
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-bold);
  font-size: var(--fair-text-3xl);
  line-height: var(--fair-leading-tight);
  letter-spacing: var(--fair-tracking-display);
  color: var(--fair-text-strong);
}
.lede {
  /* Preserve authored line breaks in multi-paragraph descriptions. */
  white-space: pre-line;
  margin: 0 0 24px;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: var(--fair-text-md);
  line-height: var(--fair-leading-normal);
  color: var(--fair-text);
}
</style>
