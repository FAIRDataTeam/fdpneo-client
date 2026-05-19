<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: "default" | "primary" | "accent" | "ghost";
    size?: "md" | "sm";
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "default", size: "md", type: "button" },
);

const classes = [
  "btn",
  props.variant === "default" ? "" : props.variant,
  props.size === "sm" ? "sm" : "",
]
  .filter(Boolean)
  .join(" ");
</script>

<template>
  <button :class="classes" :type="type">
    <slot />
  </button>
</template>
