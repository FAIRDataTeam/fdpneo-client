<script setup lang="ts">
/**
 * Group inspector (Phase 4, task 4.2): edits a selected `sh:PropertyGroup`'s
 * label and order, and deletes the group.
 */
import type { Group } from "./model";

defineProps<{ group: Group }>();
const emit = defineEmits<{
  (e: "update", patch: Partial<Pick<Group, "label" | "order">>): void;
  (e: "delete"): void;
}>();

function toNum(v: string): number {
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : 0;
}
</script>

<template>
  <div class="insp">
    <div class="head"><div class="head__name">Group</div></div>
    <section>
      <label class="f">
        <span>Label <em>rdfs:label</em></span>
        <input :value="group.label" @input="emit('update', { label: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="f">
        <span>Order <em>sh:order</em></span>
        <input
          type="number"
          :value="group.order"
          @input="emit('update', { order: toNum(($event.target as HTMLInputElement).value) })"
        />
      </label>
    </section>
    <button class="del" @click="emit('delete')">Delete group</button>
  </div>
</template>

<style scoped>
.insp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}
.head__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.f {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.f span {
  font-size: 11px;
  color: var(--muted);
}
.f em {
  font-style: normal;
  font-family: var(--font-mono);
  color: var(--muted-2);
}
input {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 7px 9px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}
.del {
  align-self: flex-start;
  font-size: 13px;
  color: var(--signal);
  background: none;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  padding: 6px 12px;
  cursor: pointer;
}
.del:hover {
  background: var(--signal-soft);
}
</style>
