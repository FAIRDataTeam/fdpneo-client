<script setup lang="ts">
/**
 * One headline number with a label and a delta indicator. The delta is
 * pre-computed by the server (or fixture); we just style it.
 *
 * `deltaUnit` is "%" by default. Use `deltaUnit="ms"` for the latency card
 * (lower-is-better — caller passes deltaIsGood=true alongside a negative
 * delta).
 */
const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    delta?: number | null;
    deltaUnit?: "%" | "ms" | "";
    /**
     * When set, overrides the sign-based default direction. Useful for
     * "lower is better" metrics (latency).
     */
    deltaIsGood?: boolean;
    hint?: string;
  }>(),
  { delta: null, deltaUnit: "%", hint: "" },
);

function deltaClass(): string {
  if (props.delta === null || props.delta === undefined) return "neutral";
  const isGood = props.deltaIsGood ?? props.delta > 0;
  return isGood ? "up" : "down";
}

function deltaText(): string {
  if (props.delta === null || props.delta === undefined) return "";
  const sign = props.delta > 0 ? "+" : "";
  return `${sign}${props.delta}${props.deltaUnit}`;
}
</script>

<template>
  <div class="card">
    <div class="label">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div v-if="delta !== null && delta !== undefined" :class="['delta', deltaClass()]">
      {{ deltaText() }}<span v-if="hint" class="hint"> · {{ hint }}</span>
    </div>
    <div v-else-if="hint" class="delta neutral">{{ hint }}</div>
  </div>
</template>

<style scoped>
.card {
  padding: 18px 20px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
}
.value {
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 32px;
  line-height: 1;
  color: var(--fair-text-strong);
  margin-top: 2px;
}
.delta {
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 11px;
  line-height: 1;
  color: var(--fair-text-muted);
}
.delta.up {
  color: var(--fair-success);
}
.delta.down {
  color: var(--fair-warning);
}
.hint {
  color: var(--fair-text-muted);
}
</style>
