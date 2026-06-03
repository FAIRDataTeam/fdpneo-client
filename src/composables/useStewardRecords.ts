/**
 * `useStewardRecords` — the steward "My metadata" listing, from the server's
 * `GET /me/dashboard` (TASKS 10.2), replacing the old SPARQL enumeration.
 *
 * The endpoint groups records into `owned`, `editable`, and `recent`. The main
 * list is "everything you can edit" = owned ∪ editable (deduped by IRI); `recent`
 * is surfaced separately. Each item's `type_iri` is mapped to a display kind +
 * label through the live type catalog (`useResourceTypes`) — so a runtime-
 * registered type shows correctly — with the DCAT `kind` kept only for TypeTag
 * colour and unknown classes defaulting neutrally.
 *
 * The contract has no publication-`state` field yet (10.3), so the row carries
 * only what's real: id, type, title, modified.
 */

import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { queryKeys } from "@/api/queries";
import { iriToId, NS } from "@/api/rdf";
import { fetchDashboard, type DashboardItem } from "@/api/dashboard";
import { useResourceTypes } from "@/composables/useResourceTypes";
import type { RecordKind } from "@/types/record";

export interface DashboardRow {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  modified: string;
}

// Cosmetic TypeTag colour for the built-in DCAT classes; runtime-registered
// types fall back to the dataset colour.
const KIND_BY_CLASS: Record<string, RecordKind> = {
  [`${NS.dcat}Catalog`]: "catalog",
  [`${NS.dcat}Dataset`]: "dataset",
  [`${NS.dcat}Distribution`]: "distribution",
  [`${NS.dcat}DataService`]: "distribution",
};

export function useStewardRecords() {
  const auth = useAuthStore();
  const { defs, specFor } = useResourceTypes();

  // class IRI → { kind, label } for every type in the live catalog.
  const byClass = computed(() => {
    const map = new Map<string, { kind: RecordKind; label: string }>();
    for (const def of defs.value) {
      const spec = specFor(def.urlPrefix);
      if (spec) map.set(spec.classIri, { kind: KIND_BY_CLASS[spec.classIri] ?? "dataset", label: spec.label });
    }
    return map;
  });

  const query = useQuery({
    queryKey: queryKeys.stewardRecords(),
    queryFn: fetchDashboard,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 30_000,
  });

  function mapItem(item: DashboardItem): DashboardRow {
    const id = iriToId(item.record_iri);
    const meta = byClass.value.get(item.type_iri ?? "") ?? {
      kind: "dataset" as RecordKind,
      label: "Resource",
    };
    return {
      id,
      type: meta.kind,
      typeLabel: meta.label,
      title: item.title || id,
      modified: (item.last_modified ?? "").slice(0, 10),
    };
  }

  // "Records you can edit" = owned ∪ editable, deduped by IRI (an owned record
  // is also editable; show it once).
  const rows = computed<DashboardRow[]>(() => {
    const d = query.data.value;
    if (!d) return [];
    const byIri = new Map<string, DashboardItem>();
    // owned first; keep the first (richer) occurrence rather than letting the
    // editable duplicate (which may omit last_modified) overwrite it.
    for (const it of [...d.owned, ...d.editable]) {
      if (!byIri.has(it.record_iri)) byIri.set(it.record_iri, it);
    }
    return [...byIri.values()].map(mapItem);
  });

  const recent = computed<DashboardRow[]>(() => (query.data.value?.recent ?? []).map(mapItem));

  return {
    rows,
    recent,
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}
