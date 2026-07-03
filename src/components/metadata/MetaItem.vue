<script setup lang="ts">
defineProps<{ label: string; mono?: boolean }>();
</script>

<template>
  <div>
    <div class="label">{{ label }}</div>
    <div :class="['value', mono ? 'mono' : '']">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.label {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 10px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-light);
  margin-bottom: 4px;
}
.value {
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1.4;
  color: var(--fair-text);
}
.value.mono {
  font-family: var(--fair-font-mono);
  font-size: 12px;
}
</style>
