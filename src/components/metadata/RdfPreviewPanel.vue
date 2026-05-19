<script setup lang="ts">
import { ref } from "vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const open = ref(true);
const formats = ["Turtle", "JSON-LD", "RDF/XML", "N-Triples"] as const;
</script>

<template>
  <section class="rdf">
    <button
      type="button"
      class="head"
      :aria-expanded="open"
      aria-controls="rdf-body"
      @click="open = !open"
    >
      <span class="label">View as RDF</span>
      <AppIcon :name="open ? 'chevron-d' : 'chevron-r'" :size="14" color="var(--muted)" />
    </button>
    <div v-if="open" id="rdf-body" class="grid">
      <button v-for="f in formats" :key="f" class="btn sm">{{ f }}</button>
    </div>
  </section>
</template>

<style scoped>
.rdf {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: var(--ink-2);
}
.label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 12px;
  line-height: 1;
  color: var(--ink-2);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.grid .btn {
  width: 100%;
  justify-content: center;
  height: 28px;
}
</style>
