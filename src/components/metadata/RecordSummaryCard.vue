<script setup lang="ts">
/**
 * Summary card for a child record in a container's "Contents" — datasets under
 * a catalog, distributions under a dataset, and so on. One card for every
 * non-root level, matching the repository landing's catalog cards so the visual
 * language is identical across levels (type-colour spine, type tag, title,
 * description, keyword chips, optional child count).
 */
import { useI18n } from "vue-i18n";
import type { ChildRecordRow } from "@/composables/useChildRecords";
import TypeTag from "@/components/shared/TypeTag.vue";
import AppChip from "@/components/shared/AppChip.vue";

const { t } = useI18n();

defineProps<{ record: ChildRecordRow }>();
</script>

<template>
  <RouterLink :to="`/records/${record.id}`" class="card" :style="{ '--spine': `var(--t-${record.type})` }">
    <div class="head">
      <TypeTag :kind="record.type">{{ record.typeLabel }}</TypeTag>
      <span v-if="record.childCount > 0" class="count mono">{{
        t("catalogCard.recordCount", { n: record.childCount })
      }}</span>
    </div>
    <h3>{{ record.label }}</h3>
    <p v-if="record.description">{{ record.description }}</p>
    <div v-if="record.keywords.length" class="keywords">
      <AppChip v-for="(kw, i) in record.keywords.slice(0, 4)" :key="kw + i" variant="outline">{{ kw }}</AppChip>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  position: relative;
  display: block;
  padding: 22px 24px;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
  text-decoration: none;
  color: inherit;
  transition: border-color 120ms ease;
}
/* type-colour spine (mirrors CatalogCard): follows the record kind via --spine,
   inset so it never clips the rounded corners. Falls back to the accent for a
   type without a --t-* token. */
.card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 3px;
  background: var(--spine, var(--accent));
}
.card:hover {
  border-color: var(--line-strong);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.count {
  font-size: 11px;
  color: var(--muted);
}
h3 {
  margin: 0 0 6px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.2;
  color: var(--ink);
}
.card:hover h3 {
  color: var(--accent);
}
p {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.keywords {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
}
</style>
