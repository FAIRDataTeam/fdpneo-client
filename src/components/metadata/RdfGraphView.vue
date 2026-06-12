<script setup lang="ts">
/**
 * Inline graph view of a record's RDF (interface note #28).
 *
 * Renders the record's triples as a one-hop node-link tree: the resource
 * instance is the central node, each predicate is an edge, and the object
 * (literal value or IRI) sits at the far end. Object IRIs that resolve to
 * another FDP record link straight to that record; other IRIs open in a new
 * tab; literals render as plain text (with any language tag / datatype shown).
 *
 * Only triples whose subject is the resource itself are drawn — blank-node
 * detail and the LDP containment listing are left out to keep the picture
 * legible in the narrow sidecar. Layout is plain HTML/CSS (connector elbows
 * drawn with borders) so it wraps gracefully at any width.
 */
import { computed } from "vue";
import { Parser } from "n3";
import { apiBase, iriToId, shortLabel, NS } from "@/api/rdf";

/** `subjectIri` is the resource's expected IRI; it's a hint, not a guarantee
 * (the root repository's IRI doesn't match its request path), so we fall back
 * to the best-connected subject when the hint carries no triples. */
const props = defineProps<{ turtle: string; subjectIri: string }>();

interface Leaf {
  key: string;
  predicate: string;
  predicateLabel: string;
  value: string;
  /** Routable record id when the object is an internal FDP IRI. */
  recordId: string | null;
  /** External href when the object is an IRI we can't route to. */
  href: string | null;
  /** "@en" / "xsd:date" style annotation for literals. */
  note: string;
}

const RDF_TYPE = `${NS.rdf}type`;

const parsed = computed<{ leaves: Leaf[]; subject: string; error: boolean }>(() => {
  let quads;
  try {
    quads = new Parser().parse(props.turtle);
  } catch {
    return { leaves: [], subject: props.subjectIri, error: true };
  }

  // Center on the hinted IRI when it has triples; otherwise the named node with
  // the most outgoing statements (the root repository describes itself under an
  // IRI that differs from its request path).
  let subject = props.subjectIri;
  if (!quads.some((q) => q.subject.value === subject)) {
    const counts = new Map<string, number>();
    for (const q of quads) {
      if (q.subject.termType !== "NamedNode") continue;
      counts.set(q.subject.value, (counts.get(q.subject.value) ?? 0) + 1);
    }
    let best = "";
    let max = 0;
    for (const [iri, n] of counts) {
      if (n > max) {
        max = n;
        best = iri;
      }
    }
    if (best) subject = best;
  }

  const base = apiBase();
  const mine = quads.filter((q) => q.subject.value === subject);
  // type first, then a stable order so the picture doesn't reshuffle on refetch.
  mine.sort((a, b) => {
    if (a.predicate.value === RDF_TYPE) return -1;
    if (b.predicate.value === RDF_TYPE) return 1;
    return a.predicate.value.localeCompare(b.predicate.value);
  });

  const leaves = mine.map((q, i): Leaf => {
    const o = q.object;
    const isIri = o.termType === "NamedNode";
    const internal = isIri && base !== "" && o.value.startsWith(`${base}/`);
    let note = "";
    if (o.termType === "Literal") {
      if (o.language) note = `@${o.language}`;
      else if (o.datatype && o.datatype.value !== `${NS.rdf}langString`) {
        const dt = o.datatype.value;
        if (!dt.endsWith("#string")) note = shortLabel(dt);
      }
    }
    return {
      key: `${q.predicate.value}|${o.value}|${i}`,
      predicate: q.predicate.value,
      predicateLabel: shortLabel(q.predicate.value) || q.predicate.value,
      value: isIri ? shortLabel(o.value) || o.value : o.value,
      recordId: internal ? iriToId(o.value) : null,
      href: isIri && !internal ? o.value : null,
      note,
    };
  });
  return { leaves, subject, error: false };
});

const subjectLabel = computed(
  () => shortLabel(parsed.value.subject) || parsed.value.subject,
);
</script>

<template>
  <div class="graph" role="group" aria-label="Record graph">
    <div class="root node" :title="parsed.subject">{{ subjectLabel }}</div>

    <p v-if="parsed.error" class="empty">Couldn't parse the record's RDF.</p>
    <p v-else-if="parsed.leaves.length === 0" class="empty">No statements to show.</p>

    <ul v-else class="branches">
      <li v-for="leaf in parsed.leaves" :key="leaf.key" class="branch">
        <span class="pred" :title="leaf.predicate">{{ leaf.predicateLabel }}</span>
        <RouterLink
          v-if="leaf.recordId"
          class="obj node iri"
          :to="{ name: 'record-detail', params: { id: leaf.recordId } }"
        >
          {{ leaf.value }}
        </RouterLink>
        <a
          v-else-if="leaf.href"
          class="obj node iri"
          :href="leaf.href"
          target="_blank"
          rel="noopener noreferrer"
          :title="leaf.href"
        >
          {{ leaf.value }}
        </a>
        <span v-else class="obj node lit">
          {{ leaf.value }}
          <span v-if="leaf.note" class="note">{{ leaf.note }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.graph {
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.4;
}
.node {
  display: inline-block;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-2, 6px);
  background: var(--surface);
  max-width: 100%;
  overflow-wrap: anywhere;
}
.root {
  font-weight: 600;
  background: var(--surface-2, var(--surface));
  border-color: var(--ink-2);
  color: var(--ink-1, var(--ink-2));
}
.branches {
  list-style: none;
  margin: 0;
  padding: 0 0 0 14px;
}
/* Connector elbows: a continuous trunk down the left, with a horizontal stub
   into each branch. The last branch trims the trunk so it stops at the elbow. */
.branch {
  position: relative;
  padding: 10px 0 0 16px;
}
.branch::before {
  content: "";
  position: absolute;
  left: 0;
  top: -10px;
  bottom: 0;
  border-left: 1px solid var(--line);
}
.branch:last-child::before {
  bottom: auto;
  height: calc(10px + 0.7em);
}
.branch::after {
  content: "";
  position: absolute;
  left: 0;
  top: calc(0.7em);
  width: 14px;
  border-top: 1px solid var(--line);
}
.pred {
  display: inline-block;
  font-size: 11px;
  color: var(--muted);
  margin-right: 6px;
  vertical-align: middle;
}
.obj {
  vertical-align: middle;
}
.obj.iri {
  color: var(--accent, var(--ink-2));
  text-decoration: none;
}
.obj.iri:hover {
  text-decoration: underline;
}
.note {
  margin-left: 6px;
  font-size: 10px;
  color: var(--muted);
  text-transform: lowercase;
}
.empty {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--muted);
}
</style>
