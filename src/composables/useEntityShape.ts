/**
 * `useEntityShape` — the SHACL-derived form fields for a resource type (7.5).
 *
 * Fetches `GET /{type}/spec` (the type's SHACL NodeShape) and parses it into
 * `FieldSpec[]`. Callers fall back to the static `EntitySpec.fields` when this
 * is loading or errors, so authoring still works if the endpoint is down.
 *
 * Takes the *resolved* base spec (from `useResourceTypes().specFor`) rather
 * than a bare type string, so it works for runtime-registered types too: it
 * needs the type's URL prefix (for the `/spec` URL) and its class IRI (to
 * locate the right shape in the returned graph), both of which live on the
 * spec — and resolving them no longer depends on the static type union.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { http } from "@/api/http";
import {
  fieldsFromShape,
  orGroupsFromShape,
  type EntitySpec,
  type FieldSpec,
  type OrConstraint,
} from "@/api/entityForms";

export interface ShapeForm {
  fields: FieldSpec[];
  orGroups: OrConstraint[];
}

async function fetchShapeForm(spec: EntitySpec): Promise<ShapeForm> {
  // The repository root has an empty prefix and is served at `/fdp-api/spec`
  // (not `/fdp-api//spec`); every other type is `/fdp-api/{prefix}/spec`.
  const url = spec.prefix ? `/fdp-api/${spec.prefix}/spec` : "/fdp-api/spec";
  const res = await http.get<string>(url, {
    headers: { Accept: "text/turtle" },
    responseType: "text",
    transformResponse: (d: unknown) => d,
  });
  return {
    fields: fieldsFromShape(res.data, spec.classIri),
    orGroups: orGroupsFromShape(res.data, spec.classIri),
  };
}

export function useEntityShape(spec: Ref<EntitySpec | null>) {
  return useQuery({
    queryKey: computed(() => ["shape", spec.value?.prefix ?? null]),
    queryFn: () => fetchShapeForm(spec.value as EntitySpec),
    enabled: computed(() => spec.value !== null),
    staleTime: 10 * 60_000,
  });
}
