<script setup lang="ts">
defineSlots<{ default: () => unknown; action?: () => unknown }>();
</script>

<template>
  <div class="section-title">
    <h4>
      <slot />
    </h4>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 32px 0 12px;
}
h4 {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
</style>
