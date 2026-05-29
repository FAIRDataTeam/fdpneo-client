/**
 * Metrics composables.
 *
 * Wrap the `/metrics/*` fetchers in `src/api/metrics.ts`. The endpoints
 * require authentication, so the queries only fire once the user is signed
 * in (`enabled`); the dashboard shows a sign-in prompt otherwise.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import {
  fetchOverview,
  fetchResourceMetrics,
  type TimeRange,
} from "@/api/metrics";

export function useMetricsOverview(range: Ref<TimeRange>) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.metricsOverview(range.value)),
    queryFn: () => fetchOverview(range.value),
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 60_000,
  });
}

export function useResourceMetrics(resourceIri: Ref<string>, range: Ref<TimeRange>) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.resourceMetrics(resourceIri.value, range.value)),
    queryFn: () => fetchResourceMetrics(resourceIri.value, range.value),
    enabled: computed(() => auth.isAuthenticated && resourceIri.value.length > 0),
    staleTime: 60_000,
  });
}
