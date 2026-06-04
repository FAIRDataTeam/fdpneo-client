/**
 * Serializer: editor model → Turtle (Phase 4, task 4.0).
 *
 * Hand-rolled (deliberately NOT the n3 `Writer`) so the output ordering is
 * fixed and the round-trip is stable — `serialize(parse(ttl))` must be
 * idempotent for Turtle this tool produced. Mirrors the design prototype's
 * `shacl.jsx generateShacl`, lifted to the multi-shape `SchemaDocument`.
 *
 * Output order: prefixes → every `sh:PropertyGroup` (deduped by IRI, in
 * document order) → each `sh:NodeShape` with its `sh:property` blocks. Within a
 * property block, terms are emitted in the fixed order below, skipping any that
 * are unset.
 */

import { DEFAULT_URI } from "@/rdf/namespaces";
import type { Field, Group, SchemaDocument, ShapeModel } from "./model";

/** Escape a string for a Turtle double-quoted literal. */
function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** A finite number, or null for anything non-numeric (so the term is omitted). */
function num(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Group IRI derived from its label, e.g. "General information" → ":GeneralinformationGroup". */
export function groupIri(label: string): string {
  return `:${(label || "group").replace(/\s+/g, "")}Group`;
}

/** The body lines of one `sh:property [ … ]` blank node, sans the wrapping brackets. */
function fieldTerms(field: Field, group: Group | null): string[] {
  const lines: string[] = [];
  lines.push(`sh:path ${field.path || ":unknownPath"}`);
  if (field.name) lines.push(`sh:name ${quote(field.name)}`);
  if (field.description) lines.push(`sh:description ${quote(field.description)}`);
  if (field.nodeKind) lines.push(`sh:nodeKind ${field.nodeKind}`);
  if (field.datatype) lines.push(`sh:datatype ${field.datatype}`);
  if (field.class) lines.push(`sh:class ${field.class}`);

  const minCount = num(field.minCount);
  if (minCount !== null) lines.push(`sh:minCount ${minCount}`);
  const maxCount = num(field.maxCount);
  if (maxCount !== null) lines.push(`sh:maxCount ${maxCount}`);
  const minLength = num(field.minLength);
  if (minLength !== null) lines.push(`sh:minLength ${minLength}`);
  const maxLength = num(field.maxLength);
  if (maxLength !== null) lines.push(`sh:maxLength ${maxLength}`);

  if (field.pattern) lines.push(`sh:pattern ${quote(field.pattern)}`);
  if (field.defaultValue) lines.push(`sh:defaultValue ${quote(field.defaultValue)}`);
  if (field.inValues && field.inValues.length > 0) {
    lines.push(`sh:in ( ${field.inValues.map(quote).join(" ")} )`);
  }
  const order = num(field.order);
  if (order !== null) lines.push(`sh:order ${order}`);
  if (field.editor) lines.push(`dash:editor ${field.editor}`);
  if (group) lines.push(`sh:group ${groupIri(group.label)}`);
  return lines;
}

/** Groups sorted by `sh:order`, stable on input order for ties. */
function sortedGroups(groups: Group[]): Group[] {
  return groups.map((g, i) => ({ g, i })).sort((a, b) => a.g.order - b.g.order || a.i - b.i).map((x) => x.g);
}

function serializeShape(shape: ShapeModel, out: string[]): void {
  out.push(`${shape.shapeIri || ":Shape"}`);
  out.push(`  a sh:NodeShape ;`);
  if (shape.label) out.push(`  rdfs:label ${quote(shape.label)} ;`);
  if (shape.comment) out.push(`  rdfs:comment ${quote(shape.comment)} ;`);
  if (shape.targetClass) out.push(`  sh:targetClass ${shape.targetClass} ;`);

  const groups = sortedGroups(shape.groups);
  const fields: { field: Field; group: Group }[] = [];
  for (const g of groups) {
    for (const f of g.fields) fields.push({ field: f, group: g });
  }

  if (fields.length === 0) {
    // No properties: turn the last emitted term's `;` into the closing `.`.
    out[out.length - 1] = out[out.length - 1].replace(/;$/, ".");
    return;
  }

  fields.forEach(({ field, group }, idx) => {
    const isLast = idx === fields.length - 1;
    const terms = fieldTerms(field, group);
    out.push(`  sh:property [`);
    terms.forEach((line, i) => {
      out.push(`    ${line}${i === terms.length - 1 ? "" : " ;"}`);
    });
    out.push(`  ]${isLast ? " ." : " ;"}`);
  });
}

/** Serialize a whole `SchemaDocument` to Turtle. */
export function serializeSchema(doc: SchemaDocument): string {
  const out: string[] = [];

  for (const p of doc.prefixes) out.push(`@prefix ${p.prefix}: <${p.uri}> .`);
  out.push(`@prefix : <${DEFAULT_URI}> .`);
  out.push("");

  // Every group across all shapes, deduped by IRI, in document order.
  const seen = new Set<string>();
  for (const shape of doc.shapes) {
    for (const g of sortedGroups(shape.groups)) {
      const iri = groupIri(g.label);
      if (seen.has(iri)) continue;
      seen.add(iri);
      out.push(`${iri}`);
      out.push(`  a sh:PropertyGroup ;`);
      out.push(`  rdfs:label ${quote(g.label || "Group")} ;`);
      out.push(`  sh:order ${num(g.order) ?? 0} .`);
      out.push("");
    }
  }

  doc.shapes.forEach((shape, i) => {
    serializeShape(shape, out);
    if (i < doc.shapes.length - 1) out.push("");
  });

  return out.join("\n");
}
