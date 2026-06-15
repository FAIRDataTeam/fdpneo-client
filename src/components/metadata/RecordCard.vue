<script setup lang="ts">
import type { SearchResult } from "@/data/sampleRecord";
import { computed } from "vue";
import TypeTag from "@/components/shared/TypeTag.vue";
import AppChip from "@/components/shared/AppChip.vue";
import AppIcon from "@/components/shared/AppIcon.vue";
import StateBadge from "@/components/shared/StateBadge.vue";
import { useHighlight } from "@/composables/useHighlight";

const props = defineProps<{ record: SearchResult; highlight?: string }>();

const segments = computed(() => useHighlight(props.record.title, props.highlight ?? ""));
const distributionCount = computed(() => {
  const d = props.record.distributions;
  if (d == null) return null;
  return Array.isArray(d) ? d.length : d;
});
</script>

<template>
  <RouterLink
    :to="`/records/${record.id}`"
    class="card"
    :style="{ '--spine': `var(--t-${record.type})` }"
  >
    <div class="main">
      <div class="chips">
        <TypeTag :kind="record.type">{{ record.typeLabel }}</TypeTag>
        <StateBadge :state="record.state" />
        <AppChip v-if="record.restricted">
          <AppIcon name="shield" :size="11" /> Institution only
        </AppChip>
        <span v-if="record.match" class="match mono">match · {{ record.match }}</span>
      </div>
      <h3>
        <template v-for="(seg, i) in segments" :key="i">
          <mark v-if="seg.match" class="hl">{{ seg.text }}</mark>
          <template v-else>{{ seg.text }}</template>
        </template>
      </h3>
      <p>{{ record.description }}</p>
      <div class="keywords">
        <AppChip
          v-for="(kw, i) in record.keywords?.slice(0, 4)"
          :key="kw + i"
          variant="outline"
          >{{ kw }}</AppChip
        >
      </div>
    </div>
    <div class="meta">
      <span class="mono">{{ record.modified }}</span>
      <span v-if="distributionCount != null">{{ distributionCount }} distributions</span>
      <span v-if="record.license">{{ record.license }}</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  padding: 18px 0 18px 16px;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  color: inherit;
}
/* type-color spine (Phase 13.4): color follows the record kind via the bound
   --spine var; vertically inset within the row's padding. */
.card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 3px;
  border-radius: 3px;
  background: var(--spine, var(--t-catalog));
}
.main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.chips {
  display: flex;
  align-items: center;
  gap: 12px;
}
.match {
  font-size: 11px;
  color: var(--muted);
}
h3 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 19px;
  line-height: 1.25;
  letter-spacing: 0.005em;
  color: var(--ink);
}
.hl {
  background: var(--signal-soft);
  color: var(--signal);
  padding: 0 2px;
  border-radius: 2px;
}
p {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
  max-width: 680px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.card:hover h3 {
  color: var(--accent);
}
</style>
