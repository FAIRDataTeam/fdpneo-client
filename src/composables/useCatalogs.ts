import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import { sampleCatalogs, type CatalogSummary } from "@/data/sampleRecord";

function fakeFetch(): Promise<CatalogSummary[]> {
  return new Promise((resolve) => setTimeout(() => resolve(sampleCatalogs), 150));
}

export function useCatalogs() {
  return useQuery({
    queryKey: queryKeys.catalogs(),
    queryFn: fakeFetch,
    staleTime: 60_000,
  });
}
