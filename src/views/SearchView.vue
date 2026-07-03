<script setup lang="ts">
/**
 * Search — the unified query surface (browse direction 2a).
 *
 * One surface, two modes behind a Text / SPARQL toggle: free-text faceted search
 * ([TextSearchPanel]) and the SPARQL playground ([SparqlPanel]). Mode is derived
 * from the route so it deep-links — `/search` opens Text, `/sparql` opens SPARQL.
 * The SPARQL tab appears only when the server enables the `sparql` feature (the
 * `/sparql` route is itself feature-gated in the router).
 */
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useConfigStore } from "@/stores/config";
import TextSearchPanel from "@/components/search/TextSearchPanel.vue";
import SparqlPanel from "@/components/sparql/SparqlPanel.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const config = useConfigStore();

const sparqlEnabled = computed(() => config.isEnabled("sparql"));
const mode = computed<"text" | "sparql">(() => (route.name === "sparql" ? "sparql" : "text"));

function setMode(next: "text" | "sparql") {
  if (next === mode.value) return;
  void router.push({ name: next === "sparql" ? "sparql" : "search" });
}
</script>

<template>
  <div class="search-surface">
    <div class="modebar" role="tablist" :aria-label="t('search.modeAria')">
      <button
        class="mode"
        role="tab"
        :aria-selected="mode === 'text'"
        :class="{ active: mode === 'text' }"
        @click="setMode('text')"
      >
        {{ t("search.modeText") }}
      </button>
      <button
        v-if="sparqlEnabled"
        class="mode"
        role="tab"
        :aria-selected="mode === 'sparql'"
        :class="{ active: mode === 'sparql' }"
        @click="setMode('sparql')"
      >
        SPARQL
      </button>
    </div>

    <TextSearchPanel v-if="mode === 'text'" route-name="search" />
    <SparqlPanel v-else-if="sparqlEnabled" />
  </div>
</template>

<style scoped>
.search-surface {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.modebar {
  display: flex;
  gap: 4px;
  padding: 14px 80px 0;
  background: var(--fair-surface);
  border-bottom: 1px solid var(--fair-separator);
}
.mode {
  padding: 8px 4px;
  margin: 0 12px -1px;
  border: 0;
  background: none;
  cursor: pointer;
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-base);
  font-weight: var(--fair-weight-medium);
  color: var(--fair-text-muted);
  border-bottom: 2px solid transparent;
}
.mode:first-child {
  margin-left: 0;
}
.mode:hover {
  color: var(--fair-text-strong);
}
.mode.active {
  color: var(--fair-text-strong);
  border-bottom-color: var(--tool-accent);
}
@media (max-width: 1100px) {
  .modebar {
    padding-left: 32px;
    padding-right: 32px;
  }
}
</style>
