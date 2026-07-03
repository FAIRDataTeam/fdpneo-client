<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CatalogSummary } from "@/data/sampleRecord";
import TypeTag from "@/components/shared/TypeTag.vue";
import AppChip from "@/components/shared/AppChip.vue";

const { t } = useI18n();

defineProps<{ catalog: CatalogSummary }>();
</script>

<template>
  <RouterLink :to="`/records/${catalog.id}`" class="card">
    <div class="head">
      <TypeTag kind="catalog">Catalog</TypeTag>
      <span class="count mono">{{ t("catalogCard.recordCount", { n: catalog.distributions }) }}</span>
    </div>
    <h3>{{ catalog.title }}</h3>
    <p>{{ catalog.description }}</p>
    <div class="keywords">
      <AppChip v-for="k in catalog.keywords" :key="k" variant="outline">{{ k }}</AppChip>
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
/* type-color spine (Phase 13.4): vertically inset so it never clips the rounded
   corners or the focus ring. Catalog cards are always the catalog kind. */
.card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 3px;
  background: var(--t-catalog);
}
.card:hover {
  border-color: var(--line-strong);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
p {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}
.keywords {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
}
</style>
