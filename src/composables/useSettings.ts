/**
 * Instance-settings composables (TASKS 10.5).
 *
 * `useSettings` reads `GET /settings` (public). `useInvalidateSettings` refreshes
 * the cache after an admin PUT/DELETE so the edited value is reflected app-wide
 * (the autocomplete sources and search-filter config read the same keys).
 */

import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import { queryKeys } from "@/api/queries";
import { fetchSettings, type SettingsValues } from "@/api/settings";

export function useSettings() {
  const query = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: fetchSettings,
    staleTime: 60_000,
  });
  return {
    settings: computed<SettingsValues>(() => query.data.value ?? {}),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}

/** Invalidate the settings cache after a mutation. */
export function useInvalidateSettings(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.settings() });
}
