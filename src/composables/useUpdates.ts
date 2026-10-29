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
import {
  OPEN_REQUEST_STATUSES,
  cancelUpdateRequest,
  checkUpdatesNow,
  fetchUpdateRequests,
  fetchUpdates,
  requestUpdate,
  updateNotices,
  type UpdateNotice,
  type UpdateRequestCreate,
} from "@/api/updates";

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

/**
 * Update requests for the optional host updater (server ADR-0030): history,
 * whether an agent is connected, request and cancel. Polls every few seconds
 * while a request is open; callers refresh the version information
 * (`refreshVersions`) once it closes.
 */
export function useUpdateRequests() {
  const auth = useAuthStore();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.updateRequests() });

  const query = useQuery({
    queryKey: queryKeys.updateRequests(),
    queryFn: fetchUpdateRequests,
    enabled: computed(() => auth.isAdmin),
    refetchOnWindowFocus: false,
    retry: false,
    refetchInterval: (q) =>
      q.state.data?.requests.some((r) => OPEN_REQUEST_STATUSES.has(r.status)) ? 5_000 : 60_000,
  });

  const hasOpen = computed(() =>
    (query.data.value?.requests ?? []).some((r) => OPEN_REQUEST_STATUSES.has(r.status)),
  );

  const request = useMutation({
    mutationFn: (body: UpdateRequestCreate) => requestUpdate(body),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelUpdateRequest(id),
    onSuccess: invalidate,
  });

  return {
    list: computed(() => query.data.value ?? null),
    hasOpen,
    refreshVersions: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.updates() }),
        client.invalidateQueries({ queryKey: queryKeys.appInfo() }),
      ]),
    request,
    cancel,
  };
}

/** Test hook: forget session dismissals. */
export function resetUpdateDismissals(): void {
  dismissed.clear();
}
