<script setup lang="ts">
defineProps<{ char: string }>();
</script>

<template>
  <span style="font-weight: 700; font-size: 14px; line-height: 1">{{ char }}</span>
</template>
