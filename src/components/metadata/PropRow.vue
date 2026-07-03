<script setup lang="ts">
defineProps<{ label: string; mono?: boolean }>();
</script>

<template>
  <div class="row">
    <dt>{{ label }}</dt>
    <dd :class="mono ? 'mono' : ''">
      <slot />
    </dd>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 24px;
  padding: 14px 0;
  border-bottom: 1px solid var(--fair-separator);
  align-items: baseline;
}
dt {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 12px;
  line-height: 1.4;
  color: var(--fair-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
dd {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fair-text);
}
dd.mono {
  font-family: var(--fair-font-mono);
  font-size: 13px;
}
</style>
