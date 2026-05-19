/**
 * `useSearch` — text + facet filtering of the fixture search results.
 *
 * Server-side search will replace this once the API lands; the call signature
 * is shaped to make that swap a one-line change.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys, type FacetSelection } from "@/api/queries";
import { sampleSearchResults, type SearchResult } from "@/data/sampleRecord";

function filter(query: string, facets: FacetSelection): SearchResult[] {
  const q = query.trim().toLowerCase();
  return sampleSearchResults.filter((rec) => {
    if (q) {
      const haystack = [rec.title, rec.description, ...(rec.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    const wantedTypes = facets.type ?? [];
    if (wantedTypes.length && !wantedTypes.includes(rec.type)) return false;
    return true;
  });
}

function fakeFetch(query: string, facets: FacetSelection): Promise<SearchResult[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(filter(query, facets)), 120),
  );
}

export function useSearch(query: Ref<string>, facets: Ref<FacetSelection>) {
  return useQuery({
    queryKey: computed(() => queryKeys.search(query.value, facets.value)),
    queryFn: () => fakeFetch(query.value, facets.value),
    staleTime: 30_000,
  });
}
