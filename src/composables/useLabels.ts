/**
 * `useLabels` — batch-resolve a reactive set of IRIs to human labels via
 * `GET /labels` (TASKS 10.6).
 *
 * Keyed on the sorted, de-duplicated IRI set so distinct components asking for
 * the same IRIs share a cache entry. The query is best-effort (`retry: false`):
 * `labelFor` falls back to the IRI-derived `shortLabel` when the server hasn't
 * resolved an IRI or the lookup failed, so detail pages never show a raw URL
 * *and* never block on the label service.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys } from "@/api/queries";
import { fetchLabels, type LabelMap } from "@/api/labels";
import { shortLabel } from "@/api/rdf";
import { useLocaleStore } from "@/stores/locale";

export function useLabels(iris: Ref<string[]>) {
  const locale = useLocaleStore();
  const wanted = computed(() => [...new Set(iris.value.filter(Boolean))].sort());

  // Request literals in the active UI language (e.g. dct:title@de), keyed on it
  // so a language switch refetches; the server falls back to untagged literals.
  const query = useQuery({
    queryKey: computed(() => queryKeys.labels(wanted.value, locale.rdfLang)),
    queryFn: () => fetchLabels(wanted.value, locale.rdfLang),
    enabled: computed(() => wanted.value.length > 0),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const labels = computed<LabelMap>(() => query.data.value ?? {});

  /** Server label if resolved, else a terse IRI-derived fallback. */
  function labelFor(iri: string | undefined): string {
    if (!iri) return "";
    return labels.value[iri] || shortLabel(iri);
  }

  return { labels, labelFor };
}
