// Adapted from Contour (sibling repo) @ 4117ff2 — SHACL engine ported into the FDP client.
// First-class client code (held to the full strict config); Contour remains a separate project.
// Hand-rolled RDF → JSON-LD serializer (export only). Avoids the heavy `jsonld`
// dependency by exploiting that Contour's graphs are tree-shaped: blank nodes
// referenced once are embedded, RDF lists collapse to @list, and IRIs compact
// against a @context built from the declared prefixes.
import type { Prefix } from './types';
import type { Quad } from './rdf';

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

type Term = Quad['object'];
interface LiteralTerm { value: string; language: string; datatype?: { value: string } }

export function quadsToJsonLd(quads: Quad[], prefixes: Prefix[]): unknown {
  const context: Record<string, string> = {};
  let emptyNs = '';
  for (const p of prefixes) {
    if (p.prefix === '') emptyNs = p.uri;
    else if (p.uri) context[p.prefix] = p.uri;
  }
  if (emptyNs) { context['@vocab'] = emptyNs; context['@base'] = emptyNs; }

  // Compact an IRI to a CURIE (longest prefix), a @base/@vocab-relative term, or full.
  const compact = (iri: string): string => {
    let best: Prefix | null = null;
    for (const p of prefixes) {
      if (p.prefix && p.uri && iri.startsWith(p.uri) && (!best || p.uri.length > best.uri.length)) best = p;
    }
    if (best) return `${best.prefix}:${iri.slice(best.uri.length)}`;
    if (emptyNs && iri.startsWith(emptyNs)) return iri.slice(emptyNs.length);
    return iri;
  };

  // ── index ────────────────────────────────────────────────────────────────
  const subjects = new Map<string, { term: Term; quads: Quad[] }>();
  for (const q of quads) {
    let e = subjects.get(q.subject.id);
    if (!e) { e = { term: q.subject, quads: [] }; subjects.set(q.subject.id, e); }
    e.quads.push(q);
  }
  const refCount = new Map<string, number>();
  for (const q of quads) {
    if (q.object.termType === 'BlankNode') refCount.set(q.object.id, (refCount.get(q.object.id) || 0) + 1);
  }
  const listNodes = new Set<string>();
  for (const q of quads) if (q.predicate.value === RDF + 'first') listNodes.add(q.subject.id);

  const visiting = new Set<string>();

  const listArray = (headId: string): unknown[] => {
    const out: unknown[] = [];
    let cur = headId;
    const guard = new Set<string>();
    while (cur && cur !== RDF + 'nil' && !guard.has(cur)) {
      guard.add(cur);
      const e = subjects.get(cur);
      if (!e) break;
      const first = e.quads.find((q) => q.predicate.value === RDF + 'first');
      const rest = e.quads.find((q) => q.predicate.value === RDF + 'rest');
      if (first) out.push(valueOf(first.object));
      cur = rest ? rest.object.id : '';
    }
    return out;
  };

  const valueOf = (o: Term): unknown => {
    if (o.termType === 'NamedNode') return { '@id': compact(o.value) };
    if (o.termType === 'BlankNode') {
      if (listNodes.has(o.id)) return { '@list': listArray(o.id) };
      if ((refCount.get(o.id) || 0) === 1 && !visiting.has(o.id)) return nodeObject(o.id, false);
      return { '@id': '_:' + o.value };
    }
    // Literal
    const lit = o as unknown as LiteralTerm;
    if (lit.language) return { '@value': o.value, '@language': lit.language };
    const dt = lit.datatype ? lit.datatype.value : XSD + 'string';
    if (dt === XSD + 'string') return o.value;
    if (dt === XSD + 'boolean') return o.value === 'true';
    if (dt === XSD + 'integer') return parseInt(o.value, 10);
    return { '@value': o.value, '@type': compact(dt) };
  };

  function nodeObject(subjId: string, topLevel: boolean): Record<string, unknown> {
    visiting.add(subjId);
    const e = subjects.get(subjId)!;
    const obj: Record<string, unknown> = {};
    if (e.term.termType === 'NamedNode') obj['@id'] = compact(e.term.value);
    else if (topLevel) obj['@id'] = '_:' + e.term.value;

    const byPred = new Map<string, Quad[]>();
    for (const q of e.quads) {
      if (!byPred.has(q.predicate.value)) byPred.set(q.predicate.value, []);
      byPred.get(q.predicate.value)!.push(q);
    }
    for (const [pred, qs] of byPred) {
      if (pred === RDF + 'type') {
        const types = qs.map((q) => compact(q.object.value));
        obj['@type'] = types.length === 1 ? types[0] : types;
        continue;
      }
      const vals = qs.map((q) => valueOf(q.object));
      obj[compact(pred)] = vals.length === 1 ? vals[0] : vals;
    }
    visiting.delete(subjId);
    return obj;
  }

  // ── top-level @graph: IRIs + non-embedded, non-list blank nodes ────────────
  const graph: unknown[] = [];
  for (const [id, e] of subjects) {
    if (listNodes.has(id)) continue;                              // consumed by @list
    if (e.term.termType === 'BlankNode' && (refCount.get(id) || 0) === 1) continue; // embedded
    graph.push(nodeObject(id, true));
  }

  return { '@context': context, '@graph': graph };
}

export function serializeJsonLd(quads: Quad[], prefixes: Prefix[]): string {
  return JSON.stringify(quadsToJsonLd(quads, prefixes), null, 2);
}