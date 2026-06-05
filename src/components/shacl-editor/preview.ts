/**
 * Form Preview helpers (Phase 4, task 4.4).
 *
 * Pure logic behind `ShaclFormPreview.vue`: map a field to the input control to
 * render, and compute which required fields are still empty (the client-side
 * "Validate record" check). Robust for both visually-authored fields (where
 * `widgetId` is set) and fields parsed from arbitrary SHACL (where it isn't) —
 * so dispatch keys off the SHACL constraints first, widget hints second.
 */

import type { Field } from "./model";
import { NUMERIC_DATATYPES } from "./widgets";

export type PreviewKind = "text" | "textarea" | "number" | "date" | "datetime" | "boolean" | "enum" | "iri";

/** The input control to render for a field. */
export function previewKind(f: Field): PreviewKind {
  if (f.inValues && f.inValues.length) return "enum";
  const dt = f.datatype;
  if (dt === "xsd:boolean") return "boolean";
  if (dt === "xsd:date") return "date";
  if (dt === "xsd:dateTime" || dt === "xsd:time") return "datetime";
  if (dt && NUMERIC_DATATYPES.has(dt)) return "number";
  if (f.nodeKind === "sh:IRI" || f.nodeKind === "sh:BlankNodeOrIRI") return "iri";
  if (
    dt === "rdf:HTML" ||
    f.widgetId === "TextAreaEditor" ||
    f.widgetId === "TextAreaWithLangEditor" ||
    f.widgetId === "RichTextEditor"
  ) {
    return "textarea";
  }
  return "text";
}

/** A field is required when `sh:minCount` ≥ 1. */
export function isRequired(f: Field): boolean {
  return (f.minCount ?? 0) > 0;
}

/** Throwaway form values, keyed by field id. */
export type PreviewValues = Record<string, string | boolean>;

/** True when a value counts as "not filled" (booleans always count as filled). */
export function isEmptyValue(v: string | boolean | undefined): boolean {
  if (typeof v === "boolean") return false;
  return v === undefined || v === "";
}

/** The required fields among `fields` whose value is still empty. */
export function missingRequired(fields: Field[], values: PreviewValues): Field[] {
  return fields.filter((f) => isRequired(f) && isEmptyValue(values[f.id]));
}
