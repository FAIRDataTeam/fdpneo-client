/**
 * `useAncestors` — the breadcrumb trail for a record, from the LDP read-extension
 * `GET /{id}/expanded` (TASKS 10.9), which returns the record merged with every
 * ancestor reachable through `dct:isPartOf` in one call.
 *
 * We walk `dct:isPartOf` from the record up to the root and return the titles
 * ordered root → … → current. Best-effort (`retry: false`): an unavailable
 * `/expanded` just yields no crumbs rather than blocking the page. Ancestors the
 * caller can't read are dropped server-side, so the chain may start mid-tree.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys } from "@/api/queries";
import { fetchExpanded } from "@/api/extensions";
import { apiBase, NS, one, parseTurtle, shortLabel } from "@/api/rdf";

export function useAncestors(id: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => queryKeys.expanded(id.value)),
    queryFn: () => fetchExpanded(id.value),
    enabled: computed(() => id.value.length > 0),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const crumbs = computed<string[]>(() => {
    const turtle = query.data.value;
    if (!turtle) return [];
    const store = parseTurtle(turtle);

    // Follow dct:isPartOf from the record IRI upward, guarding against cycles.
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = `${apiBase()}/${id.value}`;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      chain.push(cur);
      cur = one(store, cur, `${NS.dct}isPartOf`);
    }

    return chain
      .reverse()
      .map((iri) => one(store, iri, `${NS.dct}title`) ?? shortLabel(iri));
  });

  return { crumbs };
}
