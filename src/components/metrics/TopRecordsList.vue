<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { TopResourceRow } from "@/api/metrics";
import TypeTag from "@/components/shared/TypeTag.vue";

const { t } = useI18n();

defineProps<{ rows: TopResourceRow[] }>();
</script>

<template>
  <ol class="list">
    <li v-for="(r, i) in rows" :key="r.id" class="row">
      <span class="rank mono">{{ String(i + 1).padStart(2, "0") }}</span>
      <div class="meta">
        <TypeTag :kind="r.type">{{ r.typeLabel }}</TypeTag>
        <RouterLink :to="`/records/${r.id}`" class="title mono">{{ r.label }}</RouterLink>
      </div>
      <div class="stat">
        <div class="stat__value mono">{{ r.requests }}</div>
        <div class="stat__label">{{ t("metrics.statReq") }}</div>
      </div>
      <div class="stat">
        <div class="stat__value mono">{{ r.visitors }}</div>
        <div class="stat__label">{{ t("metrics.statVisitors") }}</div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: 32px 1fr 70px 70px;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.row:last-child {
  border-bottom: 0;
}
.rank {
  font-size: 11px;
  color: var(--muted-2);
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1.35;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title:hover {
  color: var(--accent);
}
.stat {
  text-align: right;
}
.stat__value {
  font-size: 13px;
  color: var(--ink);
}
.stat__label {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 10px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-top: 2px;
}
</style>
