/**
 * `usePolicies` — the deployment's managed ODRL policies (server ADR-0012).
 *
 * Caches `GET /policies` (TanStack Query) for the policy-manager list and the
 * `dct:rights` picker. `useInvalidatePolicies` refetches after a save/delete.
 * Mirrors `useSchemas`.
 */

import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type ComputedRef } from "vue";
import { listPolicies, type PolicySummary } from "@/api/policies";

export const POLICIES_KEY = ["policies"] as const;

export interface UsePolicies {
  policies: ComputedRef<PolicySummary[]>;
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
}

export function usePolicies(): UsePolicies {
  const query = useQuery({
    queryKey: POLICIES_KEY,
    queryFn: () => listPolicies(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    policies: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}

export const PUBLISHED_POLICIES_KEY = ["policies", "published"] as const;

/** Published policies only — the set assignable via `dct:rights` (ADR-0012). */
export function usePublishedPolicies(): UsePolicies {
  const query = useQuery({
    queryKey: PUBLISHED_POLICIES_KEY,
    queryFn: () => listPolicies(true),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    policies: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}

/** Invalidate the cached policy list (after a save/delete). */
export function useInvalidatePolicies(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: POLICIES_KEY });
}
