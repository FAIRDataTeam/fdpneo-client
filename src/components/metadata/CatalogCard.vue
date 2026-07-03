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
  padding: 20px 22px 20px 24px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--fair-transition);
}
/* type-color spine: vertically inset so it never clips the rounded corners or
   the focus ring. Catalog cards are always the catalog kind. */
.card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: var(--fair-radius-sm);
  background: var(--t-catalog);
}
.card:hover {
  border-color: var(--tool-accent);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.count {
  font-size: var(--fair-text-xs);
  color: var(--fair-text-muted);
}
h3 {
  margin: 0 0 6px;
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-semibold);
  font-size: var(--fair-text-lg);
  line-height: 1.25;
  letter-spacing: var(--fair-tracking-tight);
  color: var(--fair-text-strong);
}
p {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: var(--fair-text-base);
  line-height: var(--fair-leading-normal);
  color: var(--fair-text-muted);
}
.keywords {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
}
</style>
