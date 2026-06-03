/**
 * `useAutocomplete` — suggestion list for a form field, from a named server
 * source via `GET /forms/autocomplete` (TASKS 10.6).
 *
 * Reactive on `source` (the configured source name) and `prefix` (what the user
 * has typed). Disabled when no source is set, best-effort (`retry: false`) so a
 * missing/failed source just yields no suggestions — the field stays free-text.
 * Prior results are kept while the prefix changes to avoid a flicker to empty.
 */

import { useQuery, keepPreviousData } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys } from "@/api/queries";
import { fetchAutocomplete, type AutocompleteItem } from "@/api/autocomplete";

export function useAutocomplete(source: Ref<string | undefined>, prefix: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => queryKeys.autocomplete(source.value ?? "", prefix.value)),
    queryFn: () => fetchAutocomplete(source.value as string, prefix.value),
    enabled: computed(() => Boolean(source.value)),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });

  const items = computed<AutocompleteItem[]>(() => query.data.value ?? []);
  return { items };
}
