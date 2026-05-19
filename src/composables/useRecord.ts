/**
 * `useRecord` — fetch a single record by id.
 *
 * Currently resolves to the shared fixture with a small delay so loading
 * states are testable. The fetcher will be replaced by an `http.get` once the
 * OpenAPI types land.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys } from "@/api/queries";
import { sampleRecord, type FdpRecord } from "@/data/sampleRecord";

function fakeFetch(id: string): Promise<FdpRecord> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...sampleRecord, id }), 200);
  });
}

export function useRecord(id: Ref<string> | string) {
  const resolved = computed(() => (typeof id === "string" ? id : id.value));
  return useQuery({
    queryKey: computed(() => queryKeys.record(resolved.value)),
    queryFn: () => fakeFetch(resolved.value),
    staleTime: 60_000,
  });
}
