<script setup lang="ts">
import type { FdpRecord } from "@/data/sampleRecord";

const props = defineProps<{ record: FdpRecord }>();

const stats = [
  { value: String(props.record.participants), label: "Participants", mono: false },
  { value: String(props.record.visits), label: "Visits", mono: false },
  { value: String(props.record.distributions.length), label: "Distributions", mono: false },
  { value: props.record.temporal.replace(" → ongoing", "—"), label: "Temporal", mono: true },
];
</script>

<template>
  <div class="strip">
    <div v-for="s in stats" :key="s.label" class="stat">
      <div :class="['value', s.mono ? 'mono' : 'serif']">{{ s.value }}</div>
      <div class="label">{{ s.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 16px 0;
  margin-bottom: 36px;
}
.stat {
  padding: 0 12px;
  border-right: 1px solid var(--line);
}
.stat:last-child {
  border-right: 0;
}
.value {
  font-size: 28px;
  line-height: 1;
  color: var(--ink);
  margin-bottom: 4px;
}
.value.mono {
  font-family: var(--font-mono);
  font-size: 22px;
}
.value.serif {
  font-family: var(--font-serif);
  font-weight: 400;
}
.label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 10px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
}
</style>
