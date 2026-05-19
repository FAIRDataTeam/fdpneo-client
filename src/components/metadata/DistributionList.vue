<script setup lang="ts">
import type { Distribution } from "@/data/sampleRecord";
import DistributionRow from "./DistributionRow.vue";

defineProps<{ distributions: Distribution[] }>();
</script>

<template>
  <div class="list">
    <DistributionRow v-for="d in distributions" :key="d.id" :distribution="d" />
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 10px;
}
</style>
