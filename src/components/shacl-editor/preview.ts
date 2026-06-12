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
import type { RefWidget } from "@/composables/useInstances";

export type PreviewKind =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "iri"
  | "ref"
  | "details"
  | "blanknode";

/** The palette key for a field — its `widgetId`, falling back to the `dash:editor` local name. */
function widgetKey(f: Field): string {
  return f.widgetId || (f.editor?.split(/[:#/]/).pop() ?? "");
}

/** DASH reference editors → the class-instance lookup widget (mirrors the record form). */
const REF_WIDGET: Record<string, RefWidget> = {
  AutoCompleteEditor: "autocomplete",
  InstancesSelectEditor: "instances",
  SubClassEditor: "subclass",
};

/** The reference-picker widget for a field, or null when it isn't a reference editor. */
export function refWidget(f: Field): RefWidget | null {
  return REF_WIDGET[widgetKey(f)] ?? null;
}

/**
 * The input control to render for a field. Dispatch keys off the SHACL
 * constraints first (so fields parsed from arbitrary SHACL render sensibly),
 * then the DASH widget hints — which is what distinguishes the reference
 * editors (all `sh:IRI`) and the nested/blank-node editors from a plain IRI.
 */
export function previewKind(f: Field): PreviewKind {
  if (f.inValues && f.inValues.length) return "enum";
  const dt = f.datatype;
  if (dt === "xsd:boolean") return "boolean";
  if (dt === "xsd:date") return "date";
  if (dt === "xsd:dateTime" || dt === "xsd:time") return "datetime";
  if (dt && NUMERIC_DATATYPES.has(dt)) return "number";
  const key = widgetKey(f);
  if (REF_WIDGET[key]) return "ref";
  if (key === "DetailsEditor") return "details";
  if (key === "BlankNodeEditor") return "blanknode";
  if (f.nodeKind === "sh:IRI" || f.nodeKind === "sh:BlankNodeOrIRI") return "iri";
  if (dt === "rdf:HTML" || key === "TextAreaEditor" || key === "TextAreaWithLangEditor" || key === "RichTextEditor") {
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
