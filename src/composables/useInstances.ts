/**
 * `useInstances` — pickable values for the DASH reference editors.
 *
 * Switches on the widget: `subclass` lists the class's subclasses;
 * `autocomplete` lists instances filtered by the typed query `q`; `instances`
 * lists the first page of all instances. Cached per (widget, class, q).
 */

import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { fetchInstances, fetchSubclasses, type RefItem } from "@/api/instances";

export type RefWidget = "autocomplete" | "instances" | "subclass";

export function useInstances(classIri: Ref<string>, widget: Ref<RefWidget>, q: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => [
      "instances",
      widget.value,
      classIri.value,
      widget.value === "autocomplete" ? q.value.trim() : "",
    ]),
    queryFn: () =>
      widget.value === "subclass"
        ? fetchSubclasses(classIri.value)
        : fetchInstances(classIri.value, widget.value === "autocomplete" ? q.value : "", 50),
    enabled: computed(() => classIri.value.length > 0),
    staleTime: 60_000,
  });

  return {
    items: computed<RefItem[]>(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
  };
}
