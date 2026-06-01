/**
 * `useSchemas` — the deployment's published SHACL shapes (server Phase 10.1).
 *
 * Caches `GET /schemas` (TanStack Query) for the schema-manager list and for
 * the resource-definition admin "schema" picker. `useInvalidateSchemas`
 * refetches after a publish/delete so both surfaces stay current.
 */

import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type ComputedRef } from "vue";
import { listSchemas, type SchemaSummary } from "@/api/schemas";

export const SCHEMAS_KEY = ["schemas"] as const;

export interface UseSchemas {
  schemas: ComputedRef<SchemaSummary[]>;
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
}

export function useSchemas(): UseSchemas {
  const query = useQuery({
    queryKey: SCHEMAS_KEY,
    queryFn: listSchemas,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    schemas: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}

/** Invalidate the cached schema list (after a publish/delete). */
export function useInvalidateSchemas(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: SCHEMAS_KEY });
}
