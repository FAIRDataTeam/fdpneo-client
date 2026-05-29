/**
 * SPARQL query history — in-memory only.
 *
 * CLAUDE.md forbids browser storage for app state, so history lives in the
 * Pinia store and resets on reload. Capped to keep memory bounded; consecutive
 * duplicates are collapsed.
 */

import { defineStore } from "pinia";
import { ref } from "vue";

export interface HistoryEntry {
  id: string;
  query: string;
  at: number;
}

const MAX_ENTRIES = 50;

export const useSparqlHistoryStore = defineStore("sparqlHistory", () => {
  const entries = ref<HistoryEntry[]>([]);

  function add(query: string) {
    const q = query.trim();
    if (!q || entries.value[0]?.query === q) return;
    entries.value.unshift({ id: crypto.randomUUID(), query: q, at: Date.now() });
    if (entries.value.length > MAX_ENTRIES) entries.value.length = MAX_ENTRIES;
  }

  function clear() {
    entries.value = [];
  }

  return { entries, add, clear };
});
