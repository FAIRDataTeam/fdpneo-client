<script setup lang="ts">
import type { RecordKind } from "@/types/record";

defineProps<{ kind: RecordKind }>();
</script>

<template>
  <span class="type-tag"><span :class="['sq', kind]" /><slot>{{ kind }}</slot></span>
</template>
