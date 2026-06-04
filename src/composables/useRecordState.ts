/**
 * `useRecordState` (TASKS 10.3) — current publication state for a record plus a
 * transition mutation.
 *
 * State is read from the record's meta graph; on a successful transition we
 * write the new state straight into the cache and invalidate the surfaces that
 * show state or are state-gated (the record, the steward dashboard, search, and
 * the tree). Best-effort read (`retry: false`): no state → no badge/controls.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys } from "@/api/queries";
import { fetchRecordState, transitionState, type MetadataState } from "@/api/state";

export function useRecordState(id: Ref<string>) {
  const client = useQueryClient();

  const stateQuery = useQuery({
    queryKey: computed(() => queryKeys.recordState(id.value)),
    queryFn: () => fetchRecordState(id.value),
    staleTime: 30_000,
    retry: false,
  });

  const transition = useMutation({
    mutationFn: (to: MetadataState) => transitionState(id.value, to),
    onSuccess: async (res) => {
      client.setQueryData(queryKeys.recordState(id.value), res.to_state);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.record(id.value) }),
        client.invalidateQueries({ queryKey: queryKeys.stewardRecords() }),
        client.invalidateQueries({ queryKey: ["search"] }),
        client.invalidateQueries({ queryKey: queryKeys.tree() }),
      ]);
    },
  });

  return {
    state: computed<MetadataState | null>(() => stateQuery.data.value ?? null),
    transition,
  };
}
