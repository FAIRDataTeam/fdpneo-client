/**
 * `useSearch` — free-text + type-facet search over the repository.
 *
 * Implemented as a SPARQL query over the `dcat:Dataset` / `dcat:Catalog`
 * named graphs. The text term is matched against title, description, and
 * keywords; the `type` facet narrows the rdf:type set. Server-side policy
 * filtering means anonymous callers only see public records.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys, type FacetSelection } from "@/api/queries";
import { iriToId, licenseLabel, NS } from "@/api/rdf";
import { literal, sparqlSelect, value } from "@/api/sparql";
import type { RecordKind } from "@/types/record";
import type { SearchResult } from "@/data/sampleRecord";

const KW_SEP = "";

const TYPE_IRI: Partial<Record<RecordKind, string>> = {
  dataset: `${NS.dcat}Dataset`,
  catalog: `${NS.dcat}Catalog`,
};

const TYPE_LABEL: Record<string, { kind: RecordKind; label: string }> = {
  [`${NS.dcat}Dataset`]: { kind: "dataset", label: "Dataset" },
  [`${NS.dcat}Catalog`]: { kind: "catalog", label: "Catalog" },
};

function buildQuery(query: string, facets: FacetSelection): string {
  const wanted = (facets.type ?? [])
    .map((t) => TYPE_IRI[t as RecordKind])
    .filter((iri): iri is string => Boolean(iri));
  const typeList = (wanted.length ? wanted : Object.values(TYPE_IRI))
    .map((iri) => `<${iri}>`)
    .join(", ");

  const q = query.trim().toLowerCase();
  const textFilter = q
    ? `FILTER( CONTAINS(LCASE(?title), ${literal(q)})
        || CONTAINS(LCASE(COALESCE(?desc, "")), ${literal(q)})
        || CONTAINS(LCASE(COALESCE(?kw, "")), ${literal(q)}) )`
    : "";

  return `SELECT ?r ?type ?title ?desc ?license ?modified (GROUP_CONCAT(DISTINCT ?kw; SEPARATOR="${KW_SEP}") AS ?kws) WHERE {
    GRAPH ?r {
      ?r a ?type ;
         <${NS.dct}title> ?title .
      FILTER( ?type IN (${typeList}) )
      OPTIONAL { ?r <${NS.dct}description> ?desc }
      OPTIONAL { ?r <${NS.dct}license> ?license }
      OPTIONAL { ?r <${NS.dct}modified> ?modified }
      OPTIONAL { ?r <${NS.dcat}keyword> ?kw }
      ${textFilter}
    }
  } GROUP BY ?r ?type ?title ?desc ?license ?modified ORDER BY ?title`;
}

async function runSearch(query: string, facets: FacetSelection): Promise<SearchResult[]> {
  const rows = await sparqlSelect(buildQuery(query, facets));
  return rows.map((row) => {
    const iri = value(row, "r") ?? "";
    const type = value(row, "type") ?? "";
    const meta = TYPE_LABEL[type] ?? { kind: "dataset" as RecordKind, label: "Resource" };
    const kws = value(row, "kws");
    const licenseUri = value(row, "license");
    const result: SearchResult = {
      id: iriToId(iri),
      type: meta.kind,
      typeLabel: meta.label,
      title: value(row, "title") ?? iriToId(iri),
      description: value(row, "desc") ?? "",
      keywords: kws ? kws.split(KW_SEP).filter(Boolean) : [],
      modified: (value(row, "modified") ?? "").slice(0, 10),
    };
    if (licenseUri) result.license = licenseLabel(licenseUri);
    return result;
  });
}

export function useSearch(query: Ref<string>, facets: Ref<FacetSelection>) {
  return useQuery({
    queryKey: computed(() => queryKeys.search(query.value, facets.value)),
    queryFn: () => runSearch(query.value, facets.value),
    staleTime: 30_000,
  });
}
