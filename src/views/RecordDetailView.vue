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
import { useRecordState } from "@/composables/useRecordState";
import { useAuthStore } from "@/stores/auth";
import { apiBase } from "@/api/rdf";
import { allowedTransitions, type MetadataState } from "@/api/state";
import { parseFdpError } from "@/api/errors";
import { useResourceTypes } from "@/composables/useResourceTypes";
import StateBadge from "@/components/shared/StateBadge.vue";
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

// Publication state + transition controls (owner-or-admin; server is the
// authority and rejects illegal moves with 409, surfaced inline).
const { state, transition } = useRecordState(toRef(id));
const transitions = computed(() =>
  state.value ? allowedTransitions(state.value, auth.isAdmin) : [],
);
const transitionError = computed(() =>
  transition.error.value ? parseFdpError(transition.error.value) : null,
);
function changeState(to: MetadataState) {
  transition.mutate(to);
}
</script>

<template>
  <div v-if="isLoading" class="loading">Loading record…</div>
  <div v-else-if="isError || !record" class="error">
    <h2>This record isn't available.</h2>
    <p>
      It may not exist — or it may be unpublished. Draft and archived records are
      only visible to their owner or an admin; signing in may reveal it.
    </p>
  </div>
  <template v-else>
    <SecondaryNav :breadcrumbs="breadcrumbs" :identifier="record.identifier" />
    <main class="layout">
      <div class="column">
        <div v-if="state || auth.isSteward" class="state-row">
          <StateBadge :state="state" />
          <template v-if="auth.isSteward">
            <button
              v-for="t in transitions"
              :key="t.to"
              class="btn sm"
              :disabled="transition.isPending.value"
              @click="changeState(t.to)"
            >
              {{ t.label }}
            </button>
          </template>
        </div>
        <p v-if="transitionError" class="state-error" role="alert">{{ transitionError.message }}</p>
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
.state-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.state-error {
  margin: 0 0 12px;
  color: var(--signal);
  font-size: 13px;
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
