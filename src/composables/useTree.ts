import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import { sampleTree, type TreeNode } from "@/data/sampleRecord";

function fakeFetch(): Promise<TreeNode> {
  return new Promise((resolve) => setTimeout(() => resolve(sampleTree), 100));
}

export function useTree() {
  return useQuery({
    queryKey: queryKeys.tree(),
    queryFn: fakeFetch,
    staleTime: 5 * 60_000,
  });
}
