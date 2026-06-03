/**
 * `useSearch` — free-text + type-facet search over the repository.
 *
 * Implemented as a SPARQL query over the named graphs (the server's dedicated
 * `POST /search` isn't on the live contract yet — TASKS 10.2). The text term is
 * matched against title, description, and keywords; the `type` facet narrows
 * the `rdf:type` set.
 *
 * The type set is runtime-mutable on the server, so both the `?type IN (…)`
 * filter and the per-result labels are derived from the live type catalog
 * (`useResourceTypes`) rather than a hardcoded DCAT map — selecting a custom
 * type facet (e.g. `biobank`) now actually returns its records, and an
 * unfiltered search spans every registered type, not just dataset/catalog.
 *
 * Server-side policy filtering means anonymous callers only see public records.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { queryKeys, type FacetSelection } from "@/api/queries";
import { iriToId, licenseLabel, NS } from "@/api/rdf";
import { literal, sparqlSelect, value } from "@/api/sparql";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { RecordKind } from "@/types/record";
import type { SearchResult } from "@/data/sampleRecord";

const KW_SEP = "";

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

/** Snapshot of the catalog the query needs: class IRI ⇄ display metadata. */
interface TypeCatalog {
  /** class IRI → { kind, label } for result rendering. */
  byClass: Map<string, ClassMeta>;
  /** type prefix → class IRI for resolving facet selections. */
  iriForPrefix: Map<string, string>;
}

function buildQuery(query: string, classIris: string[]): string {
  const typeList = classIris.map((iri) => `<${iri}>`).join(", ");
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

async function runSearch(
  query: string,
  facets: FacetSelection,
  catalog: TypeCatalog,
): Promise<SearchResult[]> {
  // Selected type facets are URL prefixes (catalog keys); resolve to class
  // IRIs. With no (resolvable) selection, search across every known type.
  const selected = (facets.type ?? [])
    .map((prefix) => catalog.iriForPrefix.get(prefix))
    .filter((iri): iri is string => Boolean(iri));
  const classIris = selected.length ? selected : [...catalog.byClass.keys()];
  if (!classIris.length) return [];

  const rows = await sparqlSelect(buildQuery(query, classIris));
  return rows.map((row) => {
    const iri = value(row, "r") ?? "";
    const meta = catalog.byClass.get(value(row, "type") ?? "") ?? {
      kind: "dataset" as RecordKind,
      label: "Resource",
    };
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
  const { defs, specFor } = useResourceTypes();

  const catalog = computed<TypeCatalog>(() => {
    const byClass = new Map<string, ClassMeta>();
    const iriForPrefix = new Map<string, string>();
    for (const def of defs.value) {
      const spec = specFor(def.urlPrefix);
      if (!spec) continue;
      iriForPrefix.set(def.urlPrefix, spec.classIri);
      byClass.set(spec.classIri, {
        kind: KIND_BY_CLASS[spec.classIri] ?? "dataset",
        label: spec.label,
      });
    }
    return { byClass, iriForPrefix };
  });

  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.search(query.value, facets.value),
      [...catalog.value.byClass.keys()],
    ]),
    queryFn: () => runSearch(query.value, facets.value, catalog.value),
    enabled: computed(() => catalog.value.byClass.size > 0),
    staleTime: 30_000,
  });
}
