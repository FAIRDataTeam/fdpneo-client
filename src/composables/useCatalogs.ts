/**
 * `useCatalogs` — list the catalogs in the repository.
 *
 * There is no REST listing endpoint, so this enumerates `dcat:Catalog`
 * records via SPARQL. Each record lives in a named graph keyed by its IRI;
 * the `distributions` field reports the catalog's dataset count.
 */

import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import { iriToId, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import type { CatalogSummary } from "@/data/sampleRecord";

// Count children via their `dct:isPartOf` back-link (across their own named
// graphs) rather than the catalog's forward `dcat:dataset` links — the latter
// aren't maintained when a child is created, so isPartOf reflects reality.
const CATALOGS_QUERY = `SELECT ?c ?title ?desc ?modified (COUNT(DISTINCT ?child) AS ?n) WHERE {
  GRAPH ?c {
    ?c a <${NS.dcat}Catalog> ;
       <${NS.dct}title> ?title .
    OPTIONAL { ?c <${NS.dct}description> ?desc }
    OPTIONAL { ?c <${NS.dct}modified> ?modified }
  }
  OPTIONAL { GRAPH ?child { ?child <${NS.dct}isPartOf> ?c } }
} GROUP BY ?c ?title ?desc ?modified ORDER BY ?title`;

async function fetchCatalogs(): Promise<CatalogSummary[]> {
  const rows = await sparqlSelect(CATALOGS_QUERY);
  return rows.map((row) => {
    const iri = value(row, "c") ?? "";
    return {
      id: iriToId(iri),
      type: "catalog" as const,
      typeLabel: "Catalog",
      title: value(row, "title") ?? iriToId(iri),
      description: value(row, "desc") ?? "",
      keywords: [],
      modified: (value(row, "modified") ?? "").slice(0, 10),
      distributions: Number(value(row, "n") ?? 0),
    };
  });
}

export function useCatalogs() {
  return useQuery({
    queryKey: queryKeys.catalogs(),
    queryFn: fetchCatalogs,
    staleTime: 60_000,
  });
}
