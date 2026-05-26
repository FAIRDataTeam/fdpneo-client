/**
 * Metrics composables.
 *
 * Currently wrap the fixture from `src/data/sampleMetrics.ts`; swap the
 * resolver for `http.get('/metrics/overview', { params: { range } })` once
 * the OpenAPI types and the server's metrics endpoints are in.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys } from "@/api/queries";
import {
  buildOverview,
  buildResourceMetrics,
  type MetricsOverview,
  type ResourceMetrics,
  type TimeRange,
} from "@/data/sampleMetrics";

function fakeOverview(range: TimeRange): Promise<MetricsOverview> {
  return new Promise((resolve) => setTimeout(() => resolve(buildOverview(range)), 180));
}

function fakeResource(
  resourceId: string,
  range: TimeRange,
): Promise<ResourceMetrics> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(buildResourceMetrics(resourceId, range)), 140),
  );
}

export function useMetricsOverview(range: Ref<TimeRange>) {
  return useQuery({
    queryKey: computed(() => queryKeys.metricsOverview(range.value)),
    queryFn: () => fakeOverview(range.value),
    staleTime: 60_000,
  });
}

export function useResourceMetrics(
  resourceId: Ref<string>,
  range: Ref<TimeRange>,
) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.resourceMetrics(resourceId.value, range.value),
    ),
    queryFn: () => fakeResource(resourceId.value, range.value),
    staleTime: 60_000,
    enabled: computed(() => resourceId.value.length > 0),
  });
}
