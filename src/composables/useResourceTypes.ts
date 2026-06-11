/**
 * `useResourceTypes` — the deployment's metadata type catalog, loaded at runtime.
 *
 * The set of types is runtime-mutable on the server (ADR-0009), so the client
 * can't hardcode it. This composable loads `GET /resource-definitions` (cached
 * via TanStack Query) and exposes catalog-aware resolvers that mirror the
 * static `entityForms` helpers but also know about runtime-registered types:
 *
 *   - `specFor(type)`    — `EntitySpec` from the server def, else the static
 *                          DCAT fallback, else `null`.
 *   - `typeForId(id)`    — the type prefix of a path id, server or static.
 *   - `childSpecs(type)` — the specs a type can hold as children (drives the
 *                          "new child" actions and the browse tree).
 *
 * Resolvers read the reactive query data, so a view that calls them inside a
 * `computed` updates automatically once the catalog loads or is invalidated
 * (e.g. after the admin UI registers a new type). When the endpoint is
 * unavailable the resolvers fall back to the static DCAT specs, so standard
 * deployments keep working offline.
 */

import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type ComputedRef } from "vue";
import {
  ENTITY_SPECS,
  staticSpec,
  type EntitySpec,
  type EntityType,
} from "@/api/entityForms";
import {
  fetchResourceTypes,
  specFromDefinition,
  type ResourceTypeDef,
} from "@/api/resourceDefinitions";
import { useSchemas } from "./useSchemas";

export const RESOURCE_TYPES_KEY = ["resource-types"] as const;

export interface UseResourceTypes {
  defs: ComputedRef<ResourceTypeDef[]>;
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
  specFor: (type: EntityType) => EntitySpec | null;
  typeForId: (id: string) => EntityType | null;
  childSpecs: (type: EntityType) => EntitySpec[];
}

export function useResourceTypes(): UseResourceTypes {
  const query = useQuery({
    queryKey: RESOURCE_TYPES_KEY,
    queryFn: fetchResourceTypes,
    staleTime: 5 * 60_000,
    // The static DCAT fallbacks cover a server hiccup; don't hammer retries.
    retry: 1,
  });

  const defs = computed<ResourceTypeDef[]>(() => query.data.value ?? []);

  // The rdf:type for a type's instances is the schema's `sh:targetClass`, which
  // the schema list exposes (and which is distinct from the schema IRI now that
  // shapes live under the managed namespace). Build schemaIri → targetClass so
  // `specFor` stamps the right class on new records (e.g. dcat:Catalog, not the
  // schema IRI). Schemas load independently; until they do we fall back to the
  // static DCAT class inside `specFromDefinition`.
  const { schemas } = useSchemas();
  const targetClassBySchema = computed(() => {
    const map = new Map<string, string>();
    for (const s of schemas.value) if (s.iri && s.targetClass) map.set(s.iri, s.targetClass);
    return map;
  });

  function defFor(type: EntityType): ResourceTypeDef | undefined {
    return defs.value.find((d) => d.urlPrefix === type);
  }

  function specFor(type: EntityType): EntitySpec | null {
    const def = defFor(type);
    if (def) return specFromDefinition(def, targetClassBySchema.value.get(def.schemaIri) ?? null);
    return staticSpec(type) ?? null;
  }

  function typeForId(id: string): EntityType | null {
    const prefix = id.split("/")[0] ?? "";
    if (!prefix) return null;
    if (defs.value.some((d) => d.urlPrefix === prefix)) return prefix;
    return prefix in ENTITY_SPECS ? prefix : null;
  }

  function childSpecs(type: EntityType): EntitySpec[] {
    const spec = specFor(type);
    if (!spec) return [];
    return spec.childTypes
      .map((child) => specFor(child))
      .filter((s): s is EntitySpec => s !== null);
  }

  return {
    defs,
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    specFor,
    typeForId,
    childSpecs,
  };
}

/** Invalidate the cached catalog so the next read refetches (after admin mutations). */
export function useInvalidateResourceTypes(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: RESOURCE_TYPES_KEY });
}
