<script setup lang="ts">
/**
 * Search results — Focus layout family.
 *
 * Query and facet state live in the URL (`?q=…&type=…&theme=…`) so reloads and
 * back-button navigation behave correctly. CLAUDE.md forbids browser storage
 * for app state.
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSearch } from "@/composables/useSearch";
import type { FacetSelection } from "@/api/queries";
import RecordCard from "@/components/metadata/RecordCard.vue";
import FacetSection from "@/components/metadata/FacetSection.vue";
import type { FacetItem } from "@/types/facet";
import AppChip from "@/components/shared/AppChip.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

const route = useRoute();
const router = useRouter();

const query = ref(toQuery(route.query.q));
const facets = ref<FacetSelection>(parseFacets(route.query));

watch(
  () => route.query,
  (q) => {
    query.value = toQuery(q.q);
    facets.value = parseFacets(q);
  },
);

function toQuery(v: unknown): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

function parseFacets(q: Record<string, unknown>): FacetSelection {
  const out: FacetSelection = {};
  for (const key of ["type", "theme", "modified"]) {
    const v = q[key];
    if (!v) continue;
    out[key] = Array.isArray(v) ? (v.filter(Boolean) as string[]) : [v as string];
  }
  return out;
}

function pushUrl() {
  const next: Record<string, string | string[] | undefined> = { q: query.value || undefined };
  for (const [k, v] of Object.entries(facets.value)) {
    if (v && v.length) next[k] = v;
  }
  void router.replace({ name: "search", query: next });
}

function toggleFacet(group: string, value: string) {
  const current = facets.value[group] ?? [];
  facets.value = {
    ...facets.value,
    [group]: current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value],
  };
  pushUrl();
}

const { data: results, isLoading } = useSearch(query, facets);

const typeItems = computed<FacetItem[]>(() => [
  { label: "Dataset", value: "dataset", count: 38, on: (facets.value.type ?? []).includes("dataset") },
  { label: "Biobank", value: "biobank", count: 9, on: (facets.value.type ?? []).includes("biobank") },
  { label: "Publication", value: "publication", count: 14, on: (facets.value.type ?? []).includes("publication") },
  { label: "Catalog", value: "catalog", count: 4, on: (facets.value.type ?? []).includes("catalog") },
]);
const themeItems = computed<FacetItem[]>(() => [
  { label: "Neurology", value: "neurology", count: 22, on: (facets.value.theme ?? []).includes("neurology") },
  { label: "Imaging", value: "imaging", count: 18, on: (facets.value.theme ?? []).includes("imaging") },
  { label: "Cardiology", value: "cardiology", count: 11, on: (facets.value.theme ?? []).includes("cardiology") },
  { label: "Oncology", value: "oncology", count: 7, on: (facets.value.theme ?? []).includes("oncology") },
]);
const modifiedItems = computed<FacetItem[]>(() => [
  { label: "Last 30 days", value: "30", count: 6, on: (facets.value.modified ?? []).includes("30") },
  { label: "Last 90 days", value: "90", count: 18, on: (facets.value.modified ?? []).includes("90") },
  { label: "Last year", value: "365", count: 34, on: (facets.value.modified ?? []).includes("365") },
]);

function clearActiveFacet(group: string, value: string) {
  toggleFacet(group, value);
}

function submit(e: Event) {
  e.preventDefault();
  pushUrl();
}

const activeFacetChips = computed(() =>
  Object.entries(facets.value).flatMap(([group, values]) =>
    (values ?? []).map((v) => ({ group, value: v })),
  ),
);
</script>

<template>
  <section class="bar">
    <form class="bar__form" role="search" @submit="submit">
      <div class="bar__input">
        <AppIcon name="search" :size="18" color="var(--ink-2)" />
        <input
          v-model="query"
          aria-label="Search query"
          placeholder="Search records, keywords, themes…"
          @change="pushUrl"
        />
        <AppChip
          v-for="c in activeFacetChips"
          :key="c.group + c.value"
          variant="outline"
        >
          {{ c.group }}:{{ c.value }}
          <button class="x" aria-label="Remove facet" @click.prevent="clearActiveFacet(c.group, c.value)">
            <AppIcon name="x" :size="11" />
          </button>
        </AppChip>
      </div>
      <button class="btn primary" type="submit">Search</button>
    </form>
    <div class="bar__meta">
      <span>{{ results?.length ?? 0 }} results · 0.18s</span>
      <span>·</span>
      <span>across 4 catalogs</span>
      <div class="spacer" />
      <span>Sorted by relevance</span>
      <AppIcon name="chevron-d" :size="12" />
    </div>
  </section>

  <section class="results">
    <div class="results__col">
      <div v-if="isLoading" class="loading">Loading…</div>
      <RecordCard
        v-for="rec in results"
        v-else
        :key="rec.id"
        :record="rec"
        :highlight="query"
      />
    </div>
    <aside class="results__facets">
      <FacetSection
        title="Resource type"
        :items="typeItems"
        @toggle="(v: string) => toggleFacet('type', v)"
      />
      <FacetSection
        title="Theme"
        :items="themeItems"
        @toggle="(v: string) => toggleFacet('theme', v)"
      />
      <FacetSection
        title="Modified"
        :items="modifiedItems"
        @toggle="(v: string) => toggleFacet('modified', v)"
      />
    </aside>
  </section>
</template>

<style scoped>
.bar {
  background: var(--surface);
  padding: 28px 80px 22px;
  border-bottom: 1px solid var(--line);
}
.bar__form {
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  gap: 14px;
  align-items: center;
}
.bar__input {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 0 18px;
  height: 52px;
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-3);
}
.bar__input input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 15px;
  line-height: 1;
  color: var(--ink);
}
.bar__form .btn.primary {
  height: 44px;
  padding: 0 18px;
}
.x {
  background: transparent;
  border: 0;
  padding: 0;
  margin-left: 4px;
  cursor: pointer;
  color: inherit;
  display: inline-flex;
}
.bar__meta {
  max-width: 880px;
  margin: 10px auto 0;
  display: flex;
  gap: 14px;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 12px;
  line-height: 1;
  color: var(--muted);
}
.spacer {
  flex: 1;
}

.results {
  display: grid;
  grid-template-columns: minmax(0, 880px) 280px;
  gap: 40px;
  padding: 30px 80px;
  justify-content: center;
  flex: 1;
}
.loading {
  padding: 40px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 1100px) {
  .bar,
  .results {
    padding-left: 32px;
    padding-right: 32px;
  }
  .results {
    grid-template-columns: 1fr;
  }
}
</style>
