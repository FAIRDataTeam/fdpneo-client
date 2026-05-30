/**
 * Record write mutations (Phase 7.1).
 *
 * Thin `useMutation` wrappers over the `src/api/records.ts` write layer. They
 * operate at the graph level (the views build/serialize the Turtle via
 * `src/api/entityForms.ts`); on success they invalidate the read caches so the
 * tree, catalog list, steward dashboard, and the affected record refresh.
 */

import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { putGraph, deleteGraph, recordExists } from "@/api/records";
import { queryKeys } from "@/api/queries";

function useInvalidateListings() {
  const qc = useQueryClient();
  return async (recordPath?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.catalogs() }),
      qc.invalidateQueries({ queryKey: queryKeys.tree() }),
      qc.invalidateQueries({ queryKey: queryKeys.stewardRecords() }),
      qc.invalidateQueries({ queryKey: ["repository"] }),
      recordPath
        ? qc.invalidateQueries({ queryKey: queryKeys.record(recordPath) })
        : Promise.resolve(),
    ]);
  };
}

export interface CreateInput {
  path: string;
  turtle: string;
}

export function useCreateRecord() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ path, turtle }: CreateInput) => putGraph(path, turtle, null),
    onSuccess: (_etag, { path }) => invalidate(path),
  });
}

export interface UpdateInput {
  path: string;
  turtle: string;
  etag: string | null;
}

export function useUpdateRecord() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ path, turtle, etag }: UpdateInput) => putGraph(path, turtle, etag),
    onSuccess: (_etag, { path }) => invalidate(path),
  });
}

export interface DeleteInput {
  path: string;
  etag: string | null;
}

export function useDeleteRecord() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ path, etag }: DeleteInput) => deleteGraph(path, etag),
    onSuccess: (_void, { path }) => invalidate(path),
  });
}

export { recordExists };
