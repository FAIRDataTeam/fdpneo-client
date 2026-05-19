<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: "default" | "accent" | "signal" | "ok" | "outline";
    dot?: boolean;
  }>(),
  { variant: "default", dot: false },
);
</script>

<template>
  <span :class="['chip', props.variant === 'default' ? '' : props.variant]">
    <span v-if="dot" class="dot" />
    <slot />
  </span>
</template>
