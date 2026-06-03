/**
 * `useStewardRecords` — the steward "My metadata" listing.
 *
 * The server has no per-record ownership/membership (deferred to v1.x) and the
 * bundled offer grants every steward modify on all records, so "records I can
 * modify" is the full set of authorable resources. Listed via SPARQL across the
 * named graphs (policy-filtered to what the caller may read).
 *
 * The set of types is runtime-mutable on the server, so the `rdf:type` filter
 * and the per-row labels are derived from the live type catalog
 * (`useResourceTypes`) rather than a hardcoded DCAT map — a custom type
 * registered in the admin UI therefore shows up here too. The DCAT colour
 * `kind` is cosmetic (TypeTag colour); unknown classes get a neutral default.
 *
 * Publication state / version / view counts aren't exposed by the server yet
 * (TASKS 10.3), so the row carries only what's real: id, type, title, modified.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { queryKeys } from "@/api/queries";
import { iriToId, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { RecordKind } from "@/types/record";

export interface DashboardRow {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  modified: string;
}

// Cosmetic TypeTag colour for the built-in DCAT classes; runtime-registered
// types fall back to the dataset colour.
const KIND_BY_CLASS: Record<string, RecordKind> = {
  [`${NS.dcat}Catalog`]: "catalog",
  [`${NS.dcat}Dataset`]: "dataset",
  [`${NS.dcat}Distribution`]: "distribution",
  [`${NS.dcat}DataService`]: "distribution",
};

interface ClassMeta {
  kind: RecordKind;
  label: string;
}

async function fetchStewardRecords(
  byClass: Map<string, ClassMeta>,
): Promise<DashboardRow[]> {
  const typeList = [...byClass.keys()].map((iri) => `<${iri}>`).join(", ");
  if (!typeList) return [];
  const query = `SELECT ?r ?type ?title ?modified WHERE {
  GRAPH ?r {
    ?r a ?type ;
       <${NS.dct}title> ?title .
    OPTIONAL { ?r <${NS.dct}modified> ?modified }
    FILTER( ?type IN (${typeList}) )
  }
} ORDER BY ?title`;
  const rows = await sparqlSelect(query);
  return rows.map((row) => {
    const iri = value(row, "r") ?? "";
    const meta = byClass.get(value(row, "type") ?? "") ?? {
      kind: "dataset" as RecordKind,
      label: "Resource",
    };
    return {
      id: iriToId(iri),
      type: meta.kind,
      typeLabel: meta.label,
      title: value(row, "title") ?? iriToId(iri),
      modified: (value(row, "modified") ?? "").slice(0, 10),
    };
  });
}

export function useStewardRecords() {
  const { defs, specFor } = useResourceTypes();

  // class IRI → { kind, label } for every type in the live catalog.
  const byClass = computed<Map<string, ClassMeta>>(() => {
    const map = new Map<string, ClassMeta>();
    for (const def of defs.value) {
      const spec = specFor(def.urlPrefix);
      if (!spec) continue;
      map.set(spec.classIri, {
        kind: KIND_BY_CLASS[spec.classIri] ?? "dataset",
        label: spec.label,
      });
    }
    return map;
  });

  return useQuery({
    // Refetch when the catalog changes (e.g. a new type is registered).
    queryKey: computed(() => [...queryKeys.stewardRecords(), [...byClass.value.keys()]]),
    queryFn: () => fetchStewardRecords(byClass.value),
    enabled: computed(() => byClass.value.size > 0),
    staleTime: 30_000,
  });
}
