<script setup lang="ts">
/**
 * Record detail — Frame C · Focus layout.
 *
 * No permanent tree (the container browser is summoned on demand from the
 * SecondaryNav). Editorial single-column hero on the left, sticky meta card
 * on the right. Same primitives drive the steward edit variant in
 * RecordEditView.vue.
 */
import { computed, toRef } from "vue";
import { useRoute } from "vue-router";
import { useRecord } from "@/composables/useRecord";
import SecondaryNav from "@/components/metadata/SecondaryNav.vue";
import RecordHero from "@/components/metadata/RecordHero.vue";
import StatStrip from "@/components/metadata/StatStrip.vue";
import SectionTitle from "@/components/shared/SectionTitle.vue";
import PropList from "@/components/metadata/PropList.vue";
import DistributionList from "@/components/metadata/DistributionList.vue";
import AboutSidecar from "@/components/metadata/AboutSidecar.vue";

const route = useRoute();
const id = computed(() => {
  const raw = route.params.id;
  return Array.isArray(raw) ? raw.join("/") : (raw as string);
});

const { data: record, isLoading, isError } = useRecord(toRef(id));

const breadcrumbs = ["Cohort studies", "Alzheimer's Disease", "AD Cohort 2024 — MRI"];
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
