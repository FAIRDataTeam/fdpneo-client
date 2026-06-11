<script setup lang="ts">
/**
 * Advanced search — a tabbed entry hosting the two query surfaces:
 *  - "Text"   : the faceted free-text search (reused `SearchView`, pinned to
 *               this route so its URL state stays here).
 *  - "SPARQL" : the SPARQL playground, shown only when the server enables the
 *               `sparql` feature.
 *
 * Reached via the "Advanced search" link under the header search field.
 */
import { ref } from "vue";
import { useConfigStore } from "@/stores/config";
import SearchView from "./SearchView.vue";
import SparqlPlaygroundView from "./SparqlPlaygroundView.vue";

const config = useConfigStore();
const sparqlEnabled = config.isEnabled("sparql");
const tab = ref<"text" | "sparql">("text");
</script>

<template>
  <section class="advanced">
    <header class="head">
      <h1>Advanced search</h1>
      <div class="tabs" role="tablist" aria-label="Search mode">
        <button
          class="tab"
          role="tab"
          :aria-selected="tab === 'text'"
          :class="{ active: tab === 'text' }"
          @click="tab = 'text'"
        >
          Text
        </button>
        <button
          v-if="sparqlEnabled"
          class="tab"
          role="tab"
          :aria-selected="tab === 'sparql'"
          :class="{ active: tab === 'sparql' }"
          @click="tab = 'sparql'"
        >
          SPARQL
        </button>
      </div>
    </header>

    <!-- Wrap each panel in a single-root element: SearchView/SparqlPlaygroundView
         are multi-root, so v-show can't toggle them directly. -->
    <div v-show="tab === 'text'" role="tabpanel">
      <SearchView route-name="advanced-search" />
    </div>
    <div v-if="sparqlEnabled" v-show="tab === 'sparql'" role="tabpanel">
      <SparqlPlaygroundView />
    </div>
  </section>
</template>

<style scoped>
.advanced {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.head {
  padding: 28px 80px 0;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.head h1 {
  margin: 0 0 14px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 26px;
  color: var(--ink);
}
.tabs {
  display: flex;
  gap: 4px;
}
.tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

@media (max-width: 1100px) {
  .head {
    padding: 24px 32px 0;
  }
}
</style>
