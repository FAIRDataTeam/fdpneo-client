/**
 * `useChildRecords` — the child records of a container, for the record detail
 * page's "Contents" section.
 *
 * A container (repository, catalog, …) holds children of one or more types
 * (its resource-definition child links). We enumerate them via SPARQL — the
 * children of `<parent>` are the records that declare `dct:isPartOf <parent>` —
 * because the LDP page endpoint (`GET /{id}/page/{prefix}`) only serves each
 * child's title + type, and the "Contents" cards want the same summary detail
 * as the repository landing's catalog cards (description, keywords, a child
 * count). The query stays within each child's named graph. Children the caller
 * can't read are absent from the store, so anonymous visitors see only
 * published children.
 *
 * Pass the child types reactively (resolved from `useResourceTypes.childSpecs`)
 * so the query gates on the type catalog and each row's type carries the
 * catalog's human label.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { apiBase, iriToId, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import type { RecordKind } from "@/types/record";

export interface ChildRecordRow {
  id: string;
  label: string;
  /** Display kind (drives the type tag + spine colour); unknown types fall back to "dataset". */
  type: RecordKind;
  /** Human label of the child's type (e.g. "Dataset"), from the type catalog. */
  typeLabel: string;
  description: string;
  keywords: string[];
  /** Number of the child's own children (e.g. a dataset's distributions), 0 if none. */
  childCount: number;
}

export interface ChildType {
  prefix: string;
  label: string;
}

const KNOWN_KINDS = new Set<string>([
  "dataset",
  "catalog",
  "distribution",
  "biobank",
  "publication",
  "fdp",
]);

// GROUP_CONCAT joins multiple keyword bindings into one cell; the separator is
// a token unlikely to occur inside a keyword, split back out client-side.
const KW_SEP = "|||";

export function useChildRecords(id: Ref<string>, childTypes: Ref<ChildType[]>) {
  const query = useQuery({
    queryKey: computed(() => [
      "child-records",
      id.value,
      childTypes.value.map((t) => t.prefix).join(","),
    ]),
    enabled: computed(() => childTypes.value.length > 0),
    queryFn: async (): Promise<ChildRecordRow[]> => {
      const parentIri = id.value ? `${apiBase()}/${id.value}` : apiBase();
      const q = `SELECT ?s ?title ?desc (GROUP_CONCAT(DISTINCT ?kw; SEPARATOR="${KW_SEP}") AS ?kws) (COUNT(DISTINCT ?child) AS ?n) WHERE {
  GRAPH ?s {
    ?s <${NS.dct}isPartOf> <${parentIri}> ;
       <${NS.dct}title> ?title .
    OPTIONAL { ?s <${NS.dct}description> ?desc }
    OPTIONAL { ?s <${NS.dcat}keyword> ?kw }
    OPTIONAL { ?s <${NS.ldp}contains> ?child }
  }
} GROUP BY ?s ?title ?desc ORDER BY ?title`;

      const labelByPrefix = new Map(childTypes.value.map((t) => [t.prefix, t.label]));
      const rows = await sparqlSelect(q);
      return rows.map((row): ChildRecordRow => {
        const iri = value(row, "s") ?? "";
        const rid = iriToId(iri);
        const prefix = rid.split("/")[0] ?? "";
        const kws = (value(row, "kws") ?? "")
          .split(KW_SEP)
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          id: rid,
          label: value(row, "title") ?? rid,
          type: KNOWN_KINDS.has(prefix) ? (prefix as RecordKind) : "dataset",
          typeLabel: labelByPrefix.get(prefix) ?? (prefix ? prefix[0]!.toUpperCase() + prefix.slice(1) : rid),
          description: value(row, "desc") ?? "",
          keywords: kws,
          childCount: Number(value(row, "n") ?? 0),
        };
      });
    },
    staleTime: 30_000,
  });

  return {
    children: computed<ChildRecordRow[]>(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
  };
}
