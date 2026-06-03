/**
 * Operational-surface composables.
 *
 * `useAppInfo` wraps `GET /info` — public build/runtime metadata shown in the
 * footer. It rarely changes within a session, so it's cached aggressively.
 *
 * `useReadiness` wraps `GET /readyz` — a dependency probe (triple store /
 * Postgres / OIDC). It is admin-only and lightly polled so an operator sees
 * drift; the query is disabled for non-admins so we don't probe needlessly.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import { fetchAppInfo, fetchReadiness } from "@/api/info";

export function useAppInfo() {
  return useQuery({
    queryKey: queryKeys.appInfo(),
    queryFn: fetchAppInfo,
    // Build metadata is fixed for a given server process; keep it for the
    // whole session and don't refetch on focus.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useReadiness() {
  const auth = useAuthStore();
  return useQuery({
    queryKey: queryKeys.readiness(),
    queryFn: fetchReadiness,
    enabled: computed(() => auth.isAdmin),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
}
