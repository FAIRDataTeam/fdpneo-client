<script setup lang="ts">
/**
 * Repository landing — the FDP root.
 *
 * Hero block (eyebrow + serif title + lede + info card) on top, catalog grid
 * below. Reuses the same primitives as the record detail.
 */
import { useCatalogs } from "@/composables/useCatalogs";
import { sampleDeployment, sampleCatalogs } from "@/data/sampleRecord";
import CatalogCard from "@/components/metadata/CatalogCard.vue";
import MetaItem from "@/components/metadata/MetaItem.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const { data: catalogs, isLoading } = useCatalogs();
const totalRecords = sampleCatalogs.reduce((s, c) => s + c.distributions, 0);
</script>

<template>
  <section class="hero">
    <div class="hero__inner">
      <div class="hero__copy">
        <div class="eyebrow mono">FAIR Data Point</div>
        <h1>{{ sampleDeployment.name }}</h1>
        <p>
          Open metadata for cohort, imaging, biobank and registry data maintained by
          Erasmus MC researchers. Browse the catalogs, search across records, or query
          the SPARQL endpoint.
        </p>
      </div>
      <aside class="hero__card">
        <MetaItem label="Catalogs">{{ sampleCatalogs.length }} · {{ totalRecords }} records</MetaItem>
        <div class="gap" />
        <MetaItem label="Conforms to" mono>FDP Spec 1.2 · DCAT-AP 3.0</MetaItem>
        <div class="gap" />
        <MetaItem label="License">CC BY 4.0 · open metadata</MetaItem>
        <div class="hero__card-actions">
          <button class="btn sm"><AppIcon name="code" :size="12" /> Turtle</button>
          <button class="btn sm">JSON-LD</button>
          <button class="btn sm">API</button>
        </div>
      </aside>
    </div>
  </section>

  <section class="catalogs">
    <div class="catalogs__inner">
      <div class="catalogs__head">
        <h2>Catalogs</h2>
        <div class="sort">
          <span>Sort: most recent</span>
          <AppIcon name="chevron-d" :size="12" />
        </div>
      </div>
      <div v-if="isLoading" class="loading">Loading…</div>
      <div v-else class="grid">
        <CatalogCard v-for="c in catalogs" :key="c.id" :catalog="c" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 44px 80px 28px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.hero__inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 60px;
  align-items: end;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
.hero__copy h1 {
  margin: 0 0 12px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 44px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.hero__copy p {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 16px;
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 560px;
}
.hero__card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--paper);
}
.gap {
  height: 12px;
}
.hero__card-actions {
  display: flex;
  gap: 6px;
  margin-top: 14px;
}
.hero__card-actions .btn {
  flex: 1;
  justify-content: center;
}

.catalogs {
  padding: 36px 80px;
  flex: 1;
}
.catalogs__inner {
  max-width: 1080px;
  margin: 0 auto;
}
.catalogs__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.catalogs__head h2 {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.sort {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.loading {
  padding: 40px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 1000px) {
  .hero,
  .catalogs {
    padding-left: 32px;
    padding-right: 32px;
  }
  .hero__inner {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
