/**
 * Map server validation violations onto model fields (Phase 4, task 4.4).
 *
 * `validateSample` returns violations whose `resultPath` is a full IRI; model
 * fields store a prefixed path (`dct:title`). This expands each field's path
 * using the document's `@prefix` set (with a standard-namespace fallback) and
 * groups violation messages by the field id they hit — so the canvas can
 * annotate the offending fields/shapes rather than just listing violations.
 */

import { DEFAULT_URI, NAMESPACES, type PrefixDecl } from "@/rdf/namespaces";
import type { SchemaDocument } from "./model";

export interface ViolationLike {
  resultPath: string | null;
  message: string | null;
}

/** Expand a prefixed path (`dct:title`, `:Foo`) to a full IRI; pass IRIs through. */
export function expandPath(path: string, prefixes: PrefixDecl[]): string {
  if (/^https?:\/\//.test(path)) return path;
  const i = path.indexOf(":");
  if (i < 0) return path;
  const prefix = path.slice(0, i);
  const local = path.slice(i + 1);
  if (prefix === "") return `${DEFAULT_URI}${local}`;
  const fromDoc = prefixes.find((p) => p.prefix === prefix)?.uri;
  const ns = fromDoc ?? (NAMESPACES as Record<string, string>)[prefix];
  return ns ? `${ns}${local}` : path;
}

/** fieldId → violation messages, for every field whose path matches a `resultPath`. */
export function fieldViolations(doc: SchemaDocument, violations: ViolationLike[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const paths = violations.filter((v) => v.resultPath);
  if (!paths.length) return out;
  for (const shape of doc.shapes) {
    for (const group of shape.groups) {
      for (const field of group.fields) {
        const full = expandPath(field.path, doc.prefixes);
        for (const v of paths) {
          if (v.resultPath === full) {
            const list = out.get(field.id) ?? [];
            list.push(v.message ?? "Constraint violation");
            out.set(field.id, list);
          }
        }
      }
    }
  }
  return out;
}

/** shapeIri → number of its fields with at least one violation. */
export function shapeViolationCounts(doc: SchemaDocument, violations: ViolationLike[]): Map<string, number> {
  const fv = fieldViolations(doc, violations);
  const out = new Map<string, number>();
  for (const shape of doc.shapes) {
    let n = 0;
    for (const group of shape.groups) {
      for (const field of group.fields) if (fv.has(field.id)) n += 1;
    }
    if (n > 0 && shape.shapeIri) out.set(shape.shapeIri, n);
  }
  return out;
}
