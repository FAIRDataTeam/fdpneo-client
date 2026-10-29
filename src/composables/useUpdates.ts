/**
 * Update notifications (server ADR-0028): the cached release check, admin-only.
 *
 * The server refreshes it once a day, so the client reads it rarely: once per
 * session, plus whenever an admin presses "Check now" (the mutation writes the
 * fresh view straight into the cache). Dismissals live in memory only — the
 * client keeps no browser storage — so a dismissed notice returns on reload.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, reactive } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import { checkUpdatesNow, fetchUpdates, updateNotices, type UpdateNotice } from "@/api/updates";

// Module-level, so every banner instance in the session shares it.
const dismissed = reactive(new Set<string>());
const noticeKey = (n: UpdateNotice) => `${n.component}@${n.latest.version}`;

export function useUpdates() {
  const auth = useAuthStore();
  const client = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.updates(),
    queryFn: fetchUpdates,
    enabled: computed(() => auth.isAdmin),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const checkNow = useMutation({
    mutationFn: checkUpdatesNow,
    onSuccess: (view) => client.setQueryData(queryKeys.updates(), view),
  });

  const notices = computed<UpdateNotice[]>(() =>
    query.data.value ? updateNotices(query.data.value, __APP_VERSION__) : [],
  );
  const visibleNotices = computed(() => notices.value.filter((n) => !dismissed.has(noticeKey(n))));

  return {
    view: computed(() => query.data.value ?? null),
    isLoading: query.isLoading,
    isError: query.isError,
    notices,
    visibleNotices,
    dismiss: (n: UpdateNotice) => dismissed.add(noticeKey(n)),
    checkNow,
    clientVersion: __APP_VERSION__,
  };
}

/** Test hook: forget session dismissals. */
export function resetUpdateDismissals(): void {
  dismissed.clear();
}
