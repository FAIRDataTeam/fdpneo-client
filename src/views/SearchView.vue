<script setup lang="ts">
/**
 * Search results — backed by `POST /search` (TASKS 10.2).
 *
 * Query + facet state live in the URL (`?q=…&type=…&license=…`) so reloads and
 * the back button behave; pagination offset is local (resets on a new query).
 * Facet groups are rendered from the server's response facets — not hardcoded —
 * and results/total/paging come from the index, which is policy- and
 * publication-state-gated server-side. Signed-in users can save the current
 * search and re-run saved ones.
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSearch, DEFAULT_SEARCH_LIMIT } from "@/composables/useSearch";
import { useSavedQueries } from "@/composables/useSavedQueries";
import { useAuthStore } from "@/stores/auth";
import { licenseLabel, shortLabel } from "@/api/rdf";
import type { FacetSelection } from "@/api/queries";
import type { SavedQueryView } from "@/api/savedQueries";
import RecordCard from "@/components/metadata/RecordCard.vue";
import FacetSection from "@/components/metadata/FacetSection.vue";
import type { FacetItem } from "@/types/facet";
import AppChip from "@/components/shared/AppChip.vue";
import AppIcon from "@/components/shared/AppIcon.vue";

// `routeName` lets the same search UI live under a different route (e.g. the
// "Advanced search" page's Text tab) while keeping its URL-synced state on that
// route instead of bouncing to /search.
const props = withDefaults(defineProps<{ routeName?: string }>(), { routeName: "search" });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const query = ref(toQuery(route.query.q));
const facets = ref<FacetSelection>(parseFacets(route.query));
const offset = ref(0);

watch(
  () => route.query,
  (q) => {
    query.value = toQuery(q.q);
    facets.value = parseFacets(q);
    offset.value = 0;
  },
);

function toQuery(v: unknown): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

/** Every non-`q` query param is a facet dimension selection. */
function parseFacets(q: Record<string, unknown>): FacetSelection {
  const out: FacetSelection = {};
  for (const [key, v] of Object.entries(q)) {
    if (key === "q" || !v) continue;
    out[key] = Array.isArray(v) ? (v.filter(Boolean) as string[]) : [v as string];
  }
  return out;
}

function pushUrl() {
  const next: Record<string, string | string[] | undefined> = { q: query.value || undefined };
  for (const [k, v] of Object.entries(facets.value)) {
    if (v && v.length) next[k] = v;
  }
  offset.value = 0;
  void router.replace({ name: props.routeName, query: next });
}

function toggleFacet(group: string, value: string) {
  const current = facets.value[group] ?? [];
  facets.value = {
    ...facets.value,
    [group]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
  };
  pushUrl();
}

const { data, isLoading } = useSearch(query, facets, offset);

const results = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

/** Friendly label for a facet value (IRIs → short label; licenses → name). */
function prettyValue(dim: string, value: string): string {
  if (dim === "license") return licenseLabel(value);
  return value.includes("://") ? shortLabel(value) : value;
}

const facetSections = computed(() =>
  Object.entries(data.value?.facets ?? {}).map(([key, dim]) => ({
    key,
    title: dim.label,
    items: dim.values.map(
      (v): FacetItem => ({
        label: prettyValue(key, v.value),
        value: v.value,
        count: v.count,
        on: (facets.value[key] ?? []).includes(v.value),
      }),
    ),
  })),
);

// Pagination (offset/limit).
const rangeStart = computed(() => (total.value === 0 ? 0 : offset.value + 1));
const rangeEnd = computed(() => offset.value + results.value.length);
const canPrev = computed(() => offset.value > 0);
const canNext = computed(() => offset.value + DEFAULT_SEARCH_LIMIT < total.value);
function prevPage() {
  offset.value = Math.max(0, offset.value - DEFAULT_SEARCH_LIMIT);
}
function nextPage() {
  offset.value += DEFAULT_SEARCH_LIMIT;
}

function clearActiveFacet(group: string, value: string) {
  toggleFacet(group, value);
}

function submit(e: Event) {
  e.preventDefault();
  pushUrl();
}

const activeFacetChips = computed(() =>
  Object.entries(facets.value).flatMap(([group, values]) => (values ?? []).map((v) => ({ group, value: v }))),
);

// --- Saved searches -------------------------------------------------------
const saved = useSavedQueries();
const newName = ref("");

function saveCurrent() {
  const name = newName.value.trim();
  if (!name) return;
  saved.create.mutate(
    { name, query: { q: query.value, facets: facets.value } },
    { onSuccess: () => (newName.value = "") },
  );
}

function runSaved(sq: SavedQueryView) {
  const stored = sq.query as { q?: string; facets?: FacetSelection };
  query.value = stored.q ?? "";
  facets.value = stored.facets ?? {};
  pushUrl();
}
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
        <AppChip v-for="c in activeFacetChips" :key="c.group + c.value" variant="outline">
          {{ c.group }}:{{ prettyValue(c.group, c.value) }}
          <button class="x" aria-label="Remove facet" @click.prevent="clearActiveFacet(c.group, c.value)">
            <AppIcon name="x" :size="11" />
          </button>
        </AppChip>
      </div>
      <button class="btn primary" type="submit">Search</button>
    </form>
    <div class="bar__meta">
      <span>{{ total }} result{{ total === 1 ? "" : "s" }}</span>
      <span v-if="total">·</span>
      <span v-if="total">showing {{ rangeStart }}–{{ rangeEnd }}</span>
    </div>
  </section>

  <section class="results">
    <div class="results__col">
      <div v-if="isLoading" class="loading">Loading…</div>
      <template v-else>
        <div v-if="results.length === 0" class="loading">No records match your search.</div>
        <RecordCard v-for="rec in results" :key="rec.id" :record="rec" :highlight="query" />
        <div v-if="canPrev || canNext" class="pager">
          <button class="btn ghost sm" :disabled="!canPrev" @click="prevPage">
            <AppIcon name="chevron-l" :size="13" /> Previous
          </button>
          <span class="small muted">{{ rangeStart }}–{{ rangeEnd }} of {{ total }}</span>
          <button class="btn ghost sm" :disabled="!canNext" @click="nextPage">
            Next <AppIcon name="chevron-r" :size="13" />
          </button>
        </div>
      </template>
    </div>

    <aside class="results__facets">
      <FacetSection
        v-for="s in facetSections"
        :key="s.key"
        :title="s.title"
        :items="s.items"
        @toggle="(v: string) => toggleFacet(s.key, v)"
      />

      <div v-if="auth.isAuthenticated" class="saved">
        <h3 class="saved__title">Saved searches</h3>
        <form class="saved__new" @submit.prevent="saveCurrent">
          <input v-model="newName" placeholder="Name this search…" aria-label="Saved search name" />
          <button class="btn ghost sm" type="submit" :disabled="!newName.trim() || saved.create.isPending.value">
            Save
          </button>
        </form>
        <ul class="saved__list">
          <li v-for="sq in saved.queries.value" :key="sq.id">
            <button class="saved__run" @click="runSaved(sq)">{{ sq.name }}</button>
            <AppChip v-if="sq.shared" variant="accent">shared</AppChip>
            <button
              v-if="auth.isAdmin"
              class="x"
              :aria-label="sq.shared ? 'Unshare' : 'Share'"
              :title="sq.shared ? 'Unshare' : 'Share'"
              @click="saved.setShared.mutate({ id: sq.id, shared: !sq.shared })"
            >
              <AppIcon name="globe" :size="12" />
            </button>
            <button v-if="sq.mine" class="x" aria-label="Delete saved search" @click="saved.remove.mutate(sq.id)">
              <AppIcon name="x" :size="12" />
            </button>
          </li>
        </ul>
      </div>
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
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}
.pager .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.small {
  font-size: 12px;
}
.muted {
  color: var(--muted);
}

.saved {
  margin-top: 24px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.saved__title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin: 0 0 10px;
}
.saved__new {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.saved__new input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 6px 10px;
}
.saved__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.saved__list li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.saved__run {
  flex: 1;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 6px 8px;
  border-radius: var(--r-2);
  color: var(--ink-2);
  font-family: var(--font-sans);
  font-size: 13px;
  cursor: pointer;
}
.saved__run:hover {
  background: var(--surface-2);
  color: var(--ink);
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
