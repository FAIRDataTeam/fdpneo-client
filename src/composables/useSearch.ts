/**
 * `useSearch` — free-text + faceted search via `POST /search` (TASKS 10.2).
 *
 * Replaces the old SPARQL body: the server indexes records and returns paged,
 * policy- **and** publication-state-gated results plus facet dimensions. Facet
 * *selections* map onto the request — `type` → `types[]` (multi), `license` →
 * `license` (single) — and the response's facet dimensions drive the UI, so
 * nothing is hardcoded. Result `typeIri` is mapped to a display kind/label via
 * the live type catalog (`useResourceTypes`).
 */

import { useQuery, keepPreviousData } from "@tanstack/vue-query";
import { computed, ref, type Ref } from "vue";
import { queryKeys, type FacetSelection } from "@/api/queries";
import { iriToId, licenseLabel, NS } from "@/api/rdf";
import { runSearch, type FacetDimension, type SearchItem } from "@/api/search";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { RecordKind } from "@/types/record";
import type { SearchResult } from "@/data/sampleRecord";

export const DEFAULT_SEARCH_LIMIT = 20;

// Cosmetic TypeTag colour for the built-in DCAT classes; runtime types default
// to the dataset colour.
const KIND_BY_CLASS: Record<string, RecordKind> = {
  [`${NS.dcat}Catalog`]: "catalog",
  [`${NS.dcat}Dataset`]: "dataset",
  [`${NS.dcat}Distribution`]: "distribution",
  [`${NS.dcat}DataService`]: "distribution",
};

/** What the view consumes: mapped results + total + the server's facet dimensions. */
export interface SearchView {
  items: SearchResult[];
  total: number;
  facets: Record<string, FacetDimension>;
}

export function useSearch(
  queryText: Ref<string>,
  facets: Ref<FacetSelection>,
  offset: Ref<number> = ref(0),
  limit = DEFAULT_SEARCH_LIMIT,
) {
  const { defs, specFor } = useResourceTypes();

  const byClass = computed(() => {
    const map = new Map<string, { kind: RecordKind; label: string }>();
    for (const def of defs.value) {
      const spec = specFor(def.urlPrefix);
      if (spec) map.set(spec.classIri, { kind: KIND_BY_CLASS[spec.classIri] ?? "dataset", label: spec.label });
    }
    return map;
  });

  function mapItem(item: SearchItem): SearchResult {
    const id = iriToId(item.recordIri);
    const meta = byClass.value.get(item.typeIri ?? "") ?? { kind: "dataset" as RecordKind, label: "Resource" };
    const result: SearchResult = {
      id,
      type: meta.kind,
      typeLabel: meta.label,
      title: item.title || id,
      description: item.description ?? "",
      keywords: [],
      modified: (item.updatedAt ?? "").slice(0, 10),
      state: item.state ?? null,
    };
    if (item.license) result.license = licenseLabel(item.license);
    return result;
  }

  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.search(queryText.value, facets.value),
      offset.value,
      limit,
    ]),
    queryFn: async (): Promise<SearchView> => {
      const res = await runSearch({
        query: queryText.value.trim() || null,
        types: facets.value.type ?? [],
        license: facets.value.license?.[0] ?? null,
        offset: offset.value,
        limit,
      });
      return { items: res.items.map(mapItem), total: res.total, facets: res.facets };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
