/**
 * FDP Index targets composable (server ADR-0025): list + add/remove/ping-now,
 * admin-gated (the endpoints 403 otherwise), cache-invalidating. Ping results
 * also invalidate the list so the per-target status columns refresh.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import {
  addIndexTarget,
  listIndexTargets,
  pingIndexes,
  removeIndexTarget,
  type IndexTargetCreateRequest,
  type IndexTargetInfo,
} from "@/api/indexTargets";

export function useIndexTargets() {
  const auth = useAuthStore();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.indexTargets() });

  const query = useQuery({
    queryKey: queryKeys.indexTargets(),
    queryFn: listIndexTargets,
    enabled: computed(() => auth.isAdmin),
    staleTime: 30_000,
  });

  const add = useMutation({
    mutationFn: (input: IndexTargetCreateRequest) => addIndexTarget(input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeIndexTarget(id),
    onSuccess: invalidate,
  });
  const ping = useMutation({ mutationFn: pingIndexes, onSuccess: invalidate });

  return {
    targets: computed<IndexTargetInfo[]>(() => query.data.value ?? []),
    isLoading: query.isLoading,
    isError: query.isError,
    add,
    remove,
    ping,
  };
}
