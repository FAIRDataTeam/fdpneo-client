<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { TimeRange } from "@/api/metrics";

const { t } = useI18n();

const props = defineProps<{ modelValue: TimeRange }>();
const emit = defineEmits<{ (e: "update:modelValue", v: TimeRange): void }>();

const options: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

function select(v: TimeRange) {
  if (v !== props.modelValue) emit("update:modelValue", v);
}
</script>

<template>
  <div class="picker" role="radiogroup" :aria-label="t('metrics.timeRangeAria')">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :class="['btn sm', modelValue === opt.value ? 'active' : 'ghost']"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: var(--fair-highlight);
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
}
.btn.active {
  background: var(--fair-surface);
  color: var(--fair-text-strong);
  border-color: var(--fair-border);
  box-shadow: var(--fair-shadow-1);
}
</style>
