/**
 * `useStewardRecords` — the steward "My metadata" listing.
 *
 * The server has no per-record ownership/membership (deferred to v1.x) and the
 * bundled offer grants every steward modify on all records, so "records I can
 * modify" is the full set of authorable resources. Listed via SPARQL across the
 * named graphs (policy-filtered to what the caller may read). Publication state
 * / version / view counts aren't exposed by the server yet (TASKS 9.1), so the
 * row carries only what's real: id, type, title, modified.
 */

import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import { iriToId, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import type { RecordKind } from "@/types/record";

export interface DashboardRow {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  modified: string;
}

// rdf:type IRI → display kind (for TypeTag colour) + label. DataService has no
// dedicated RecordKind, so it borrows the distribution colour.
const CLASS_MAP: Record<string, { kind: RecordKind; label: string }> = {
  [`${NS.dcat}Catalog`]: { kind: "catalog", label: "Catalog" },
  [`${NS.dcat}Dataset`]: { kind: "dataset", label: "Dataset" },
  [`${NS.dcat}Distribution`]: { kind: "distribution", label: "Distribution" },
  [`${NS.dcat}DataService`]: { kind: "distribution", label: "Data service" },
};

const TYPE_LIST = Object.keys(CLASS_MAP)
  .map((iri) => `<${iri}>`)
  .join(", ");

const QUERY = `SELECT ?r ?type ?title ?modified WHERE {
  GRAPH ?r {
    ?r a ?type ;
       <${NS.dct}title> ?title .
    OPTIONAL { ?r <${NS.dct}modified> ?modified }
    FILTER( ?type IN (${TYPE_LIST}) )
  }
} ORDER BY ?title`;

async function fetchStewardRecords(): Promise<DashboardRow[]> {
  const rows = await sparqlSelect(QUERY);
  return rows.map((row) => {
    const iri = value(row, "r") ?? "";
    const meta = CLASS_MAP[value(row, "type") ?? ""] ?? {
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
  return useQuery({
    queryKey: queryKeys.stewardRecords(),
    queryFn: fetchStewardRecords,
    staleTime: 30_000,
  });
}
