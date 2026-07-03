/**
 * `useEffectiveAccess` — the ODRL Offer that governs read/modify/… on a record,
 * resolved for the record detail's "Access — in effect" card.
 *
 * The server's PDP resolves access up the containment chain; here we surface the
 * *nearest declared* policy the client can see: the record's own `dct:rights`
 * when present ("self"), otherwise the repository root's default ("inherited").
 * That covers the common topology (records inherit the root default); a policy
 * set on an intermediate container is a known simplification — the card links to
 * the resolved policy so the exact document is always one click away.
 */

import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { apiBase, NS, one, parseTurtle } from "@/api/rdf";
import { readGraph } from "@/api/records";
import { getPolicyTurtle } from "@/api/policies";
import { parseOffer } from "@/components/odrl-editor/parse";
import { summariseOffer } from "@/components/metadata/accessSummary";
import type { FdpRecord } from "@/data/sampleRecord";

export type AccessSource = "self" | "inherited" | "none";

/** Policy id from an Offer IRI (`…/policies/{id}` → `{id}`); "" if not a managed policy. */
function policyIdFromIri(iri: string): string {
  return /\/policies\/([^/]+)\/?$/.exec(iri)?.[1] ?? "";
}

export function useEffectiveAccess(record: Ref<FdpRecord | undefined>) {
  // Repository root's default policy — only needed when the record declares none.
  const rootRights = useQuery({
    queryKey: ["root-rights"],
    enabled: computed(() => record.value !== undefined && !record.value.rightsUri),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { turtle } = await readGraph("");
      const store = parseTurtle(turtle);
      return one(store, apiBase(), `${NS.dct}rights`) ?? "";
    },
  });

  const source = computed<AccessSource>(() => {
    if (record.value?.rightsUri) return "self";
    if (rootRights.data.value) return "inherited";
    return "none";
  });

  const policyIri = computed(() => record.value?.rightsUri || rootRights.data.value || "");
  const policyId = computed(() => policyIdFromIri(policyIri.value));

  const summary = useQuery({
    queryKey: computed(() => ["access-summary", policyId.value]),
    enabled: computed(() => !!policyId.value),
    staleTime: 5 * 60_000,
    queryFn: async () => summariseOffer(parseOffer(await getPolicyTurtle(policyId.value))),
  });

  return {
    source,
    policyIri,
    summary: summary.data,
    isLoading: computed(() => rootRights.isLoading.value || summary.isLoading.value),
    isError: summary.isError,
  };
}
