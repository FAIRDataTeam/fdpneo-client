/**
 * `useLicenses` — the deployment's managed license documents (server ADR-0012).
 *
 * Caches `GET /licenses` for the license-manager list and the `dct:license`
 * picker. Mirrors `usePolicies`/`useSchemas`.
 */

import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type ComputedRef } from "vue";
import { listLicenses, type LicenseSummary } from "@/api/licenses";

export const LICENSES_KEY = ["licenses"] as const;

export interface UseLicenses {
  licenses: ComputedRef<LicenseSummary[]>;
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
}

export function useLicenses(): UseLicenses {
  const query = useQuery({
    queryKey: LICENSES_KEY,
    queryFn: listLicenses,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    licenses: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}

/** Invalidate the cached license list (after a save/delete). */
export function useInvalidateLicenses(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: LICENSES_KEY });
}
