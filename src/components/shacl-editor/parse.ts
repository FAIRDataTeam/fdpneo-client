/**
 * Parser: Turtle → editor model (Phase 4, task 4.0) — the inverse of
 * `serialize.ts`. Built on n3 (the access patterns mirror
 * `entityForms.ts fieldsFromShape`, but this is lossless for the supported
 * subset and multi-shape).
 *
 * n3 expands prefixed names to full IRIs; the model stores the prefixed form
 * (`dct:title`, `:DatasetShape`), so we re-compact every IRI using the
 * document's declared `@prefix` set. `id`s are freshly minted (client-only and
 * never serialized), so round-trip equality is checked ignoring them.
 */

import { DataFactory, Parser, Store, type Term } from "n3";
import { DEFAULT_URI, NAMESPACES, type PrefixDecl } from "@/rdf/namespaces";
import type { Field, Group, SchemaDocument, ShapeModel } from "./model";
import { widgetForEditor } from "./widgets";

// Wrap rather than destructure (see rdf.ts): pulling the bare method off
// DataFactory trips @typescript-eslint/unbound-method.
const namedNode = (iri: string) => DataFactory.namedNode(iri);
const RDF = NAMESPACES.rdf;
const SH = NAMESPACES.sh;
const RDFS = NAMESPACES.rdfs;
const DASH = NAMESPACES.dash;

export class ShaclParseError extends Error {}

/** Build an IRI→prefixed-name compactor from the declared prefixes (longest match wins). */
function makeCompactor(prefixes: PrefixDecl[]): (iri: string) => string {
  // Default namespace first so ":local" is preferred for the schema's own terms.
  const entries: [string, string][] = [["", DEFAULT_URI], ...prefixes.map((p) => [p.prefix, p.uri] as [string, string])];
  entries.sort((a, b) => b[1].length - a[1].length);
  return (iri: string): string => {
    for (const [prefix, uri] of entries) {
      if (iri.startsWith(uri)) return `${prefix}:${iri.slice(uri.length)}`;
    }
    return iri;
  };
}

let counter = 0;
const nextId = (kind: string): string => `${kind}${++counter}`;

export function parseSchema(turtle: string): SchemaDocument {
  // n3's callback form is async (errors escape as unhandled rejections); the
  // no-callback form parses synchronously and throws on malformed input. It
  // doesn't surface prefixes, so we read the `@prefix` declarations directly.
  const store = new Store();
  try {
    store.addQuads(new Parser().parse(turtle));
  } catch (e) {
    throw new ShaclParseError(e instanceof Error ? e.message : String(e));
  }

  const prefixes: PrefixDecl[] = [];
  const declRe = /@prefix\s+([\w-]*):\s*<([^>]*)>\s*\./g;
  for (let m = declRe.exec(turtle); m !== null; m = declRe.exec(turtle)) {
    const [, prefix, uri] = m;
    if (prefix !== "" && uri !== DEFAULT_URI) prefixes.push({ prefix, uri });
  }

  const compact = makeCompactor(prefixes);
  const lit = (s: Term, p: string): string => store.getObjects(s, namedNode(`${SH}${p}`), null)[0]?.value ?? "";
  const rdfsLit = (s: Term, p: string): string => store.getObjects(s, namedNode(`${RDFS}${p}`), null)[0]?.value ?? "";
  const iri = (s: Term, p: string): string | null => {
    const o = store.getObjects(s, namedNode(`${SH}${p}`), null)[0];
    return o ? compact(o.value) : null;
  };
  const numOf = (s: Term, p: string): number | null => {
    const v = store.getObjects(s, namedNode(`${SH}${p}`), null)[0]?.value;
    if (v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Group blocks: full IRI → { label, order }.
  const groupInfo = new Map<string, { label: string; order: number }>();
  for (const g of store.getSubjects(namedNode(`${RDF}type`), namedNode(`${SH}PropertyGroup`), null)) {
    groupInfo.set(g.value, { label: rdfsLit(g, "label"), order: Number(lit(g, "order")) || 0 });
  }

  const readList = (head: Term): string[] => {
    const out: string[] = [];
    let node: Term | undefined = head;
    while (node && node.value !== `${RDF}nil`) {
      const first = store.getObjects(node, namedNode(`${RDF}first`), null)[0];
      if (first) out.push(first.value);
      node = store.getObjects(node, namedNode(`${RDF}rest`), null)[0];
    }
    return out;
  };

  const readField = (p: Term): { field: Field; groupRef: string | null } => {
    const datatype = iri(p, "datatype");
    const editorObj = store.getObjects(p, namedNode(`${DASH}editor`), null)[0];
    const editorCompact = editorObj ? compact(editorObj.value) : null;

    const inHead = store.getObjects(p, namedNode(`${SH}in`), null)[0];
    const inValues = inHead ? readList(inHead) : null;
    const groupObj = store.getObjects(p, namedNode(`${SH}group`), null)[0];

    const field: Field = {
      id: nextId("f"),
      widgetId: widgetForEditor(editorCompact, datatype),
      editor: editorCompact,
      name: lit(p, "name"),
      description: lit(p, "description"),
      path: iri(p, "path") ?? ":unknownPath",
      nodeKind: iri(p, "nodeKind"),
      datatype,
      class: iri(p, "class"),
      minCount: numOf(p, "minCount"),
      maxCount: numOf(p, "maxCount"),
      minLength: numOf(p, "minLength"),
      maxLength: numOf(p, "maxLength"),
      pattern: lit(p, "pattern"),
      defaultValue: lit(p, "defaultValue"),
      inValues: inValues && inValues.length ? inValues : null,
      order: numOf(p, "order") ?? 0,
    };
    return { field, groupRef: groupObj ? groupObj.value : null };
  };

  const shapes: ShapeModel[] = [];
  for (const s of store.getSubjects(namedNode(`${RDF}type`), namedNode(`${SH}NodeShape`), null)) {
    const props = store.getObjects(s, namedNode(`${SH}property`), null).map(readField);

    // Bucket fields by their referenced group (full IRI; null → an empty-label group).
    const byGroup = new Map<string | null, Field[]>();
    for (const { field, groupRef } of props) {
      const list = byGroup.get(groupRef) ?? [];
      list.push(field);
      byGroup.set(groupRef, list);
    }

    const groups: Group[] = [];
    for (const [groupRef, fields] of byGroup) {
      const info = groupRef ? groupInfo.get(groupRef) : undefined;
      fields.sort((a, b) => a.order - b.order);
      groups.push({ id: nextId("g"), label: info?.label ?? "", order: info?.order ?? 0, fields });
    }
    groups.sort((a, b) => a.order - b.order);

    shapes.push({
      id: nextId("s"),
      shapeIri: compact(s.value),
      label: rdfsLit(s, "label"),
      comment: rdfsLit(s, "comment"),
      targetClass: iri(s, "targetClass") ?? "",
      groups,
    });
  }

  return { prefixes, shapes };
}
