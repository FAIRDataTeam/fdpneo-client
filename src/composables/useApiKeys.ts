/**
 * Personal access tokens composable (TASKS 10.4): list + create/revoke, auth-gated,
 * cache-invalidating. The create mutation's result carries the one-time plaintext
 * key — the caller shows it in a copy-once dialog.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeyCreateRequest,
  type ApiKeyInfo,
} from "@/api/apiKeys";

export function useApiKeys() {
  const auth = useAuthStore();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.apiKeys() });

  const query = useQuery({
    queryKey: queryKeys.apiKeys(),
    queryFn: listApiKeys,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 30_000,
  });

  const create = useMutation({ mutationFn: (i: ApiKeyCreateRequest) => createApiKey(i), onSuccess: invalidate });
  const revoke = useMutation({ mutationFn: (id: string) => revokeApiKey(id), onSuccess: invalidate });

  return {
    keys: computed<ApiKeyInfo[]>(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    create,
    revoke,
  };
}
