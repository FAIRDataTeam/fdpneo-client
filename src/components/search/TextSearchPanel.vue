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
import { useI18n } from "vue-i18n";
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

const { t } = useI18n();
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
        <AppIcon name="search" :size="18" color="var(--fair-text)" />
        <input
          v-model="query"
          :aria-label="t('search.queryAria')"
          :placeholder="t('search.placeholder')"
          @change="pushUrl"
        />
        <AppChip v-for="c in activeFacetChips" :key="c.group + c.value" variant="outline">
          {{ c.group }}:{{ prettyValue(c.group, c.value) }}
          <button
            class="x"
            :aria-label="t('search.removeFacet')"
            @click.prevent="clearActiveFacet(c.group, c.value)"
          >
            <AppIcon name="x" :size="11" />
          </button>
        </AppChip>
      </div>
      <button class="btn primary" type="submit">{{ t("search.searchButton") }}</button>
    </form>
    <div class="bar__meta">
      <span>{{ t("search.results", total) }}</span>
      <span v-if="total">·</span>
      <span v-if="total">{{ t("search.showing", { start: rangeStart, end: rangeEnd }) }}</span>
    </div>
  </section>

  <section class="results">
    <div class="results__col">
      <div v-if="isLoading" class="loading">{{ t("common.loading") }}</div>
      <template v-else>
        <div v-if="results.length === 0" class="loading">{{ t("search.noResults") }}</div>
        <RecordCard v-for="rec in results" :key="rec.id" :record="rec" :highlight="query" />
        <div v-if="canPrev || canNext" class="pager">
          <button class="btn ghost sm" :disabled="!canPrev" @click="prevPage">
            <AppIcon name="chevron-l" :size="13" /> {{ t("search.previous") }}
          </button>
          <span class="small muted">{{
            t("search.rangeOf", { start: rangeStart, end: rangeEnd, total })
          }}</span>
          <button class="btn ghost sm" :disabled="!canNext" @click="nextPage">
            {{ t("search.next") }} <AppIcon name="chevron-r" :size="13" />
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
        <h3 class="saved__title">{{ t("search.savedSearches") }}</h3>
        <form class="saved__new" @submit.prevent="saveCurrent">
          <input
            v-model="newName"
            :placeholder="t('search.nameThisSearch')"
            :aria-label="t('search.savedSearchName')"
          />
          <button class="btn ghost sm" type="submit" :disabled="!newName.trim() || saved.create.isPending.value">
            {{ t("search.save") }}
          </button>
        </form>
        <ul class="saved__list">
          <li v-for="sq in saved.queries.value" :key="sq.id">
            <button class="saved__run" @click="runSaved(sq)">{{ sq.name }}</button>
            <AppChip v-if="sq.shared" variant="accent">{{ t("search.shared") }}</AppChip>
            <button
              v-if="auth.isAdmin"
              class="x"
              :aria-label="sq.shared ? t('search.unshare') : t('search.share')"
              :title="sq.shared ? t('search.unshare') : t('search.share')"
              @click="saved.setShared.mutate({ id: sq.id, shared: !sq.shared })"
            >
              <AppIcon name="globe" :size="12" />
            </button>
            <button
              v-if="sq.mine"
              class="x"
              :aria-label="t('search.deleteSavedSearch')"
              @click="saved.remove.mutate(sq.id)"
            >
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
  background: var(--fair-surface);
  padding: 24px 80px 20px;
  border-bottom: 1px solid var(--fair-border);
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
  background: var(--fair-surface-input);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-lg);
}
.bar__input:focus-within {
  border-color: var(--tool-accent);
  box-shadow: var(--fair-focus-ring-accent);
}
.bar__input input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: var(--fair-text-md);
  line-height: 1;
  color: var(--fair-text-strong);
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
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: var(--fair-text-sm);
  line-height: 1;
  color: var(--fair-text-muted);
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
  color: var(--fair-text-muted);
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
  font-size: var(--fair-text-sm);
}
.muted {
  color: var(--fair-text-muted);
}

.saved {
  margin-top: 24px;
  border-top: 1px solid var(--fair-separator);
  padding-top: 16px;
}
.saved__title {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-xs);
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
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
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-md);
  background: var(--fair-surface-input);
  color: var(--fair-text-strong);
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-base);
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
  border-radius: var(--fair-radius-md);
  color: var(--fair-text);
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-base);
  cursor: pointer;
}
.saved__run:hover {
  background: var(--fair-highlight);
  color: var(--fair-text-strong);
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
