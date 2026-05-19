<script setup lang="ts">
import AppIcon from "@/components/shared/AppIcon.vue";
import type { FacetItem } from "@/types/facet";

defineProps<{ title: string; items: FacetItem[] }>();
const emit = defineEmits<{ (e: "toggle", value: string): void }>();
</script>

<template>
  <div class="facets">
    <div class="title">{{ title }}</div>
    <div class="items">
      <label v-for="it in items" :key="it.value" class="item" :class="{ on: it.on }">
        <span
          class="box"
          :aria-checked="it.on"
          role="checkbox"
          tabindex="0"
          @click.prevent="emit('toggle', it.value)"
          @keydown.space.prevent="emit('toggle', it.value)"
          @keydown.enter.prevent="emit('toggle', it.value)"
        >
          <AppIcon v-if="it.on" name="check" :size="10" color="#fff" />
        </span>
        <span class="label">{{ it.label }}</span>
        <span class="count mono">{{ it.count }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.facets {
  margin-bottom: 24px;
}
.title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 10px;
}
.items {
  display: grid;
  gap: 4px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1;
  color: var(--ink-2);
  cursor: pointer;
}
.item.on {
  color: var(--ink);
}
.box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  display: grid;
  place-items: center;
  color: #fff;
  cursor: pointer;
}
.item.on .box {
  border-color: var(--accent);
  background: var(--accent);
}
.label {
  flex: 1;
}
.count {
  font-size: 11px;
  color: var(--muted);
}
</style>
