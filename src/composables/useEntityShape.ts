/**
 * `useEntityShape` — the SHACL-derived form fields for a resource type (7.5).
 *
 * Fetches `GET /{type}/spec` (the type's SHACL NodeShape) and parses it into
 * `FieldSpec[]`. Callers fall back to the static `EntitySpec.fields` when this
 * is loading or errors, so authoring still works if the endpoint is down.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { http } from "@/api/http";
import { fieldsFromShape, specFor, type EntityType, type FieldSpec } from "@/api/entityForms";

async function fetchShapeFields(type: EntityType): Promise<FieldSpec[]> {
  const res = await http.get<string>(`/${type}/spec`, {
    headers: { Accept: "text/turtle" },
    responseType: "text",
    transformResponse: (d: unknown) => d,
  });
  return fieldsFromShape(res.data, specFor(type).classIri);
}

export function useEntityShape(type: Ref<EntityType | null>) {
  return useQuery({
    queryKey: computed(() => ["shape", type.value]),
    queryFn: () => fetchShapeFields(type.value as EntityType),
    enabled: computed(() => type.value !== null),
    staleTime: 10 * 60_000,
  });
}
