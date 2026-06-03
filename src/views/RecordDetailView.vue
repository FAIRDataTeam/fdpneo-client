<script setup lang="ts">
/**
 * Record detail — Frame C · Focus layout.
 *
 * No permanent tree (the container browser is summoned on demand from the
 * SecondaryNav). Editorial single-column hero on the left, sticky meta card
 * on the right. Stewards get inline Edit / "New child" actions; editing itself
 * lives in EntityEditView.vue.
 */
import { computed, toRef } from "vue";
import { useRoute } from "vue-router";
import { useRecord } from "@/composables/useRecord";
import { useAncestors } from "@/composables/useAncestors";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import { useResourceTypes } from "@/composables/useResourceTypes";
import SecondaryNav from "@/components/metadata/SecondaryNav.vue";
import RecordHero from "@/components/metadata/RecordHero.vue";
import StatStrip from "@/components/metadata/StatStrip.vue";
import SectionTitle from "@/components/shared/SectionTitle.vue";
import PropList from "@/components/metadata/PropList.vue";
import DistributionList from "@/components/metadata/DistributionList.vue";
import AboutSidecar from "@/components/metadata/AboutSidecar.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const route = useRoute();
const auth = useAuthStore();
const { typeForId, childSpecs } = useResourceTypes();
const id = computed(() => {
  const raw = route.params.id;
  return Array.isArray(raw) ? raw.join("/") : (raw as string);
});

const { data: record, isLoading, isError } = useRecord(toRef(id));

const entityType = computed(() => typeForId(id.value));
const childCreateLinks = computed(() => {
  if (!entityType.value) return [];
  const parent = encodeURIComponent(`${apiBase()}/${id.value}`);
  // childSpecs resolves from the runtime catalog, so a child link added to a
  // type at runtime (e.g. Catalog → a new Ontology type) shows up here.
  return childSpecs(entityType.value).map((s) => ({
    label: s.label,
    to: `/create/${s.prefix}?parent=${parent}`,
  }));
});

// Real breadcrumb trail from /expanded (record + dct:isPartOf ancestors).
const { crumbs: breadcrumbs } = useAncestors(toRef(id));
</script>

<template>
  <div v-if="isLoading" class="loading">Loading record…</div>
  <div v-else-if="isError || !record" class="error">
    <h2>This record could not be loaded.</h2>
    <p>The server returned an error or no record matched that identifier.</p>
  </div>
  <template v-else>
    <SecondaryNav :breadcrumbs="breadcrumbs" :identifier="record.identifier" />
    <main class="layout">
      <div class="column">
        <div v-if="auth.isSteward && entityType" class="steward-actions">
          <RouterLink :to="`/records/${id}/edit`" class="btn sm">
            <AppIcon name="edit" :size="12" /> Edit
          </RouterLink>
          <RouterLink v-for="c in childCreateLinks" :key="c.to" :to="c.to" class="btn sm">
            <AppIcon name="plus" :size="12" /> New {{ c.label.toLowerCase() }}
          </RouterLink>
        </div>
        <RecordHero :record="record" />
        <StatStrip :record="record" />
        <SectionTitle>Properties</SectionTitle>
        <PropList :record="record" />
        <SectionTitle>Distributions</SectionTitle>
        <DistributionList :distributions="record.distributions" />
      </div>
      <AboutSidecar :record="record" />
    </main>
  </template>
</template>

<style scoped>
.layout {
  flex: 1;
  padding: 44px 80px 40px;
  display: grid;
  grid-template-columns: minmax(0, 760px) 320px;
  gap: 60px;
  justify-content: center;
  background: var(--paper);
}
.column {
  min-width: 0;
}
.steward-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.steward-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.loading,
.error {
  padding: 80px 40px;
  text-align: center;
  color: var(--muted);
}
.error h2 {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 28px;
  color: var(--ink);
  margin: 0 0 8px;
}

@media (max-width: 1100px) {
  .layout {
    padding: 32px 32px 40px;
    grid-template-columns: 1fr;
  }
}
</style>
