/**
 * `useRecord` — fetch a single record by its path id (e.g. `dataset/ad-cohort-2024`).
 *
 * The id is the resource's path under the FDP base, which is exactly the
 * server route: `GET /{id}` returns the record as RDF (Turtle). Distributions
 * live in their own graphs, so when the record links to any we fetch their
 * details with one SPARQL query and fold them into the result.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { http } from "@/api/http";
import { queryKeys } from "@/api/queries";
import { apiBase, distributionIris, iriToId, mapRecord, NS } from "@/api/rdf";
import { sparqlSelect, value } from "@/api/sparql";
import type { Distribution, FdpRecord } from "@/data/sampleRecord";

async function fetchTurtle(path: string): Promise<string> {
  const res = await http.get<string>(`/${path}`, {
    headers: { Accept: "text/turtle" },
    responseType: "text",
  });
  return res.data;
}

async function fetchDistributions(iris: string[]): Promise<Distribution[]> {
  if (iris.length === 0) return [];
  const values = iris.map((iri) => `<${iri}>`).join(" ");
  const query = `SELECT ?d ?title ?format ?download WHERE {
    VALUES ?d { ${values} }
    GRAPH ?d {
      ?d a <${NS.dcat}Distribution> .
      OPTIONAL { ?d <${NS.dct}title> ?title }
      OPTIONAL { ?d <${NS.dct}format> ?format }
      OPTIONAL { ?d <${NS.dcat}downloadURL> ?download }
    }
  }`;
  const rows = await sparqlSelect(query);
  return rows.map((row) => {
    const iri = value(row, "d") ?? "";
    return {
      id: iriToId(iri),
      title: value(row, "title") ?? iriToId(iri),
      format: value(row, "format") ?? "",
      size: null,
      access: value(row, "download") ? "Open download" : "",
    };
  });
}

async function fetchRecord(path: string): Promise<FdpRecord> {
  const turtle = await fetchTurtle(path);
  const iri = `${apiBase()}/${path}`;
  const distributions = await fetchDistributions(distributionIris(turtle, iri));
  return mapRecord(turtle, iri, distributions);
}

export function useRecord(id: Ref<string> | string) {
  const resolved = computed(() => (typeof id === "string" ? id : id.value));
  return useQuery({
    queryKey: computed(() => queryKeys.record(resolved.value)),
    queryFn: () => fetchRecord(resolved.value),
    staleTime: 60_000,
  });
}
