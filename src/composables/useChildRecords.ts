/**
 * `useChildRecords` — the child records of a container, for the record detail
 * page's "Contents" section.
 *
 * A container (repository, catalog, …) holds children of one or more types
 * (its resource-definition child links). We fetch one LDP page per child type
 * (`GET /fdp-api/{id}/page/{prefix}`, see `fetchChildrenPage`) and merge them
 * into a flat, type-labelled list. Children the caller can't read are dropped
 * server-side, so an anonymous visitor sees only published children.
 *
 * Pass the child types reactively (resolved from `useResourceTypes.childSpecs`)
 * so the query re-runs once the type catalog loads.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { fetchChildrenPage } from "@/api/extensions";

export interface ChildRecordRow {
  id: string;
  label: string;
  /** Human label of the child's type (e.g. "Dataset"), for grouping/tagging. */
  typeLabel: string;
}

export interface ChildType {
  prefix: string;
  label: string;
}

export function useChildRecords(id: Ref<string>, childTypes: Ref<ChildType[]>) {
  const query = useQuery({
    queryKey: computed(() => [
      "child-records",
      id.value,
      childTypes.value.map((t) => t.prefix).join(","),
    ]),
    enabled: computed(() => id.value.length > 0 && childTypes.value.length > 0),
    queryFn: async (): Promise<ChildRecordRow[]> => {
      const rows: ChildRecordRow[] = [];
      for (const t of childTypes.value) {
        try {
          const page = await fetchChildrenPage(id.value, t.prefix, { limit: 100 });
          for (const c of page.children) {
            rows.push({ id: c.id, label: c.label, typeLabel: t.label });
          }
        } catch {
          // A child type with no readable members (or a transient error)
          // simply contributes nothing — the rest still render.
        }
      }
      return rows;
    },
    staleTime: 30_000,
  });

  return {
    children: computed<ChildRecordRow[]>(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
  };
}
