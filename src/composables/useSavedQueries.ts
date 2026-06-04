/**
 * Saved-search composable (TASKS 10.2): list + create/delete/share mutations
 * over `/me/saved-queries`, with cache invalidation. Auth-gated (the list only
 * fires when signed in).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import {
  createSavedQuery,
  deleteSavedQuery,
  listSavedQueries,
  updateSavedQuery,
  type SavedQueryCreate,
  type SavedQueryView,
} from "@/api/savedQueries";

export function useSavedQueries() {
  const auth = useAuthStore();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.savedQueries() });

  const query = useQuery({
    queryKey: queryKeys.savedQueries(),
    queryFn: listSavedQueries,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 60_000,
  });

  const create = useMutation({ mutationFn: (i: SavedQueryCreate) => createSavedQuery(i), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => deleteSavedQuery(id), onSuccess: invalidate });
  const setShared = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) => updateSavedQuery(id, { shared }),
    onSuccess: invalidate,
  });

  return {
    queries: computed<SavedQueryView[]>(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    create,
    remove,
    setShared,
  };
}
