/**
 * `useRepository` — the FDP repository (root) metadata.
 *
 * The root resource lives at the API base (`/`). This is read-only, for
 * display (e.g. the browse hero). Editing goes through `RepositoryEditView`,
 * which reads its own copy with the ETag for a read-modify-write `PUT`.
 */

import { useQuery } from "@tanstack/vue-query";
import { http } from "@/api/http";
import { apiBase, NS, one, parseTurtle } from "@/api/rdf";

export interface RepositoryInfo {
  iri: string;
  title: string;
  description: string;
  publisher: string;
}

export function parseRepository(turtle: string, iri: string): RepositoryInfo {
  const store = parseTurtle(turtle);
  return {
    iri,
    title: one(store, iri, `${NS.dct}title`) ?? "",
    description: one(store, iri, `${NS.dct}description`) ?? "",
    publisher: one(store, iri, `${NS.dct}publisher`) ?? "",
  };
}

async function fetchRepository(): Promise<RepositoryInfo> {
  const res = await http.get<string>("/", {
    headers: { Accept: "text/turtle" },
    responseType: "text",
    transformResponse: (d: unknown) => d,
  });
  return parseRepository(res.data, apiBase());
}

export function useRepository() {
  return useQuery({
    queryKey: ["repository"],
    queryFn: fetchRepository,
    staleTime: 5 * 60_000,
  });
}
