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
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.version {
  font-size: 11px;
  color: var(--muted);
}
h1 {
  margin: 0 0 18px;
  font-family: var(--font-serif);
  font-weight: 500;
  font-optical-sizing: auto;
  font-size: 44px;
  line-height: 1.08;
  letter-spacing: -0.012em;
  color: var(--ink);
}
.lede {
  margin: 0 0 36px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 17px;
  line-height: 1.6;
  color: var(--ink-2);
  letter-spacing: 0.005em;
}
</style>
