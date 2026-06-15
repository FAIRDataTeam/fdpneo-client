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
import { apiBase, classify, iriToId, NS, one, parseTurtle, shortLabel } from "@/api/rdf";
import type { RecordKind } from "@/types/record";

/**
 * A breadcrumb: a label, its route target (`null` for the current record), and
 * the record kind (drives the lineage-rail node color). The repository root is
 * always `fdp`; other hops are classified from their `rdf:type` in the graph.
 */
export interface Crumb {
  label: string;
  to: string | null;
  type: RecordKind;
}

export function useAncestors(id: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => queryKeys.expanded(id.value)),
    queryFn: () => fetchExpanded(id.value),
    enabled: computed(() => id.value.length > 0),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const crumbs = computed<Crumb[]>(() => {
    const turtle = query.data.value;
    if (!turtle) return [];
    const store = parseTurtle(turtle);

    // Follow dct:isPartOf from the record IRI upward, guarding against cycles.
    const chain: string[] = [];
    const seen = new Set<string>();
    const base = apiBase();
    let cur: string | undefined = `${base}/${id.value}`;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      chain.push(cur);
      cur = one(store, cur, `${NS.dct}isPartOf`);
    }

    const ordered = chain.reverse();
    return ordered.map((iri, i) => {
      const label = one(store, iri, `${NS.dct}title`) ?? shortLabel(iri);
      // The last crumb is the current record — not a link. The repository root
      // (the API base itself) is browsed at "/"; everything else at /records/:id.
      const to = i === ordered.length - 1 ? null : iri === base ? "/" : `/records/${iriToId(iri)}`;
      // The root is the FDP repository; other hops classify from their rdf:type.
      const type: RecordKind = iri === base ? "fdp" : classify(store, iri).kind;
      return { label, to, type };
    });
  });

  return { crumbs };
}
