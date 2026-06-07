/**
 * `useUsers` — the IdP user directory via the server `/users` facade (ADR-0013).
 *
 * `useUsers(params)` is search/paging-aware (the key includes the params, so
 * changing search/offset refetches). `useAssignableRoles` caches the curated
 * role set for the editor; `useInvalidateUsers` refetches after a mutation.
 */

import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type ComputedRef, type Ref } from "vue";
import { listAssignableRoles, listUsers, type ListUsersParams, type User } from "@/api/users";

export const USERS_KEY = ["users"] as const;
export const USER_ROLES_KEY = ["users", "roles"] as const;

export interface UseUsers {
  users: ComputedRef<User[]>;
  total: ComputedRef<number>;
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
  error: ComputedRef<unknown>;
}

export function useUsers(params: Ref<ListUsersParams>): UseUsers {
  const query = useQuery({
    queryKey: computed(() => [...USERS_KEY, params.value.search ?? "", params.value.limit ?? 0, params.value.offset ?? 0]),
    queryFn: () => listUsers(params.value),
    staleTime: 30_000,
    retry: 1,
  });
  return {
    users: computed(() => query.data.value?.users ?? []),
    total: computed(() => query.data.value?.total ?? 0),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    error: computed(() => query.error.value),
  };
}

export function useAssignableRoles(): ComputedRef<string[]> {
  const query = useQuery({
    queryKey: USER_ROLES_KEY,
    queryFn: listAssignableRoles,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  return computed(() => query.data.value ?? []);
}

/** Invalidate every cached user list (after create/update/delete). */
export function useInvalidateUsers(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: USERS_KEY });
}
