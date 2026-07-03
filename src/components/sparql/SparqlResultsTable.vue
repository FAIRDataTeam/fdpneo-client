<script setup lang="ts">
/**
 * Renders SPARQL SELECT bindings as a table. IRIs that resolve under the FDP
 * base link through to the record view; everything else renders as text, with
 * the language tag / datatype shown for typed literals.
 */
import { useI18n } from "vue-i18n";
import { iriToId, apiBase } from "@/api/rdf";
import type { SparqlBinding, SparqlValue } from "@/api/sparql";

const { t } = useI18n();

defineProps<{ vars: string[]; rows: SparqlBinding[] }>();

function recordLink(value: SparqlValue): string | null {
  if (value.type !== "uri") return null;
  const base = apiBase();
  return base && value.value.startsWith(`${base}/`) ? `/records/${iriToId(value.value)}` : null;
}

function suffix(value: SparqlValue): string {
  if (value["xml:lang"]) return `@${value["xml:lang"]}`;
  if (value.datatype) return `^^${value.datatype.split(/[#/]/).pop() ?? ""}`;
  return "";
}
</script>

<template>
  <div class="wrap">
    <table class="results">
      <thead>
        <tr>
          <th v-for="v in vars" :key="v" class="mono">{{ v }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="v in vars" :key="v">
            <template v-if="row[v]">
              <RouterLink
                v-if="recordLink(row[v]!)"
                :to="recordLink(row[v]!)!"
                class="cell-uri mono"
              >
                {{ row[v]!.value }}
              </RouterLink>
              <span v-else :class="['cell', row[v]!.type === 'uri' ? 'mono' : '']">
                {{ row[v]!.value }}<span class="suffix">{{ suffix(row[v]!) }}</span>
              </span>
            </template>
            <span v-else class="unbound">—</span>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="vars.length || 1" class="empty">{{ t("sparql.noResults") }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap {
  overflow: auto;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
}
.results {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--fair-separator);
  vertical-align: top;
}
th {
  position: sticky;
  top: 0;
  background: var(--fair-highlight);
  color: var(--fair-text-muted);
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
td {
  color: var(--fair-text);
}
.cell-uri {
  color: var(--tool-accent);
  text-decoration: none;
}
.cell-uri:hover {
  text-decoration: underline;
}
.suffix {
  color: var(--fair-text-muted);
  font-size: 11px;
  margin-left: 2px;
}
.unbound {
  color: var(--fair-text-light);
}
.empty {
  text-align: center;
  color: var(--fair-text-muted);
  padding: 24px;
}
</style>
