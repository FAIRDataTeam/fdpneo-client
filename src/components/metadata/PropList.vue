<script setup lang="ts">
import type { FdpRecord } from "@/data/sampleRecord";
import PropRow from "./PropRow.vue";
import AppChip from "@/components/shared/AppChip.vue";

defineProps<{ record: FdpRecord }>();
</script>

<template>
  <dl class="list">
    <PropRow label="Publisher">
      <a :href="record.publisherUri" class="accent">{{ record.publisher }}</a>
    </PropRow>
    <PropRow label="License">
      <a :href="record.licenseUri" class="accent">{{ record.license }}</a>
    </PropRow>
    <PropRow label="Themes">
      <div class="themes">
        <AppChip v-for="t in record.themes" :key="t" variant="accent">{{ t }}</AppChip>
      </div>
    </PropRow>
    <PropRow label="Conforms to" mono>{{ record.conformsTo }}</PropRow>
    <PropRow label="Identifier" mono>
      <span class="muted">{{ record.identifier }}</span>
    </PropRow>
  </dl>
</template>

<style scoped>
.list {
  margin: 0;
}
.themes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.accent {
  color: var(--accent);
}
</style>
