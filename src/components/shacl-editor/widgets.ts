/**
 * DASH form widget catalog (Phase 4, task 4.0).
 *
 * The full editor set from the DASH forms vocabulary
 * (https://datashapes.org/forms.html) — every `dash:…Editor` — plus one
 * synthetic widget, `NumberFieldEditor`, which reuses `dash:TextFieldEditor`
 * but seeds a numeric datatype (DASH has no distinct numeric editor; the form
 * designer disambiguates by datatype). This is the source of truth for the
 * palette, a field's default constraints, and the `dash:editor` ⇄ `widgetId`
 * mapping the parser/serializer rely on.
 *
 * `glyph` is a short label for the palette icon tile; the form-designer UI
 * (4.2) may later map these to `AppIcon` names. Constraint values are stored in
 * the model's prefixed form (e.g. "xsd:string").
 */

export type WidgetCategory = "Text" | "References" | "Choice" | "Date & number";

export interface WidgetDefaults {
  nodeKind?: string;
  datatype?: string;
  class?: string;
  inValues?: string[];
}

export interface WidgetDef {
  /** stable key; equals the `dash:editor` local name except `NumberFieldEditor` */
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  /** the `dash:editor` IRI written to / read from SHACL (prefixed) */
  editor: string;
  glyph: string;
  defaults: WidgetDefaults;
}

/** Datatypes that classify a `dash:TextFieldEditor` as the Number widget. */
export const NUMERIC_DATATYPES = new Set<string>([
  "xsd:integer", "xsd:decimal", "xsd:double", "xsd:float", "xsd:long",
]);

export const WIDGETS: WidgetDef[] = [
  // Text
  { id: "TextFieldEditor", name: "Text field", description: "Single-line text", category: "Text", editor: "dash:TextFieldEditor", glyph: "T", defaults: { nodeKind: "sh:Literal", datatype: "xsd:string" } },
  { id: "TextAreaEditor", name: "Text area", description: "Multi-line text", category: "Text", editor: "dash:TextAreaEditor", glyph: "¶", defaults: { nodeKind: "sh:Literal", datatype: "xsd:string" } },
  { id: "RichTextEditor", name: "Rich text", description: "HTML / formatted text", category: "Text", editor: "dash:RichTextEditor", glyph: "B", defaults: { nodeKind: "sh:Literal", datatype: "rdf:HTML" } },
  { id: "TextFieldWithLangEditor", name: "Text field (lang)", description: "Single-line text with language tag", category: "Text", editor: "dash:TextFieldWithLangEditor", glyph: "T₠", defaults: { nodeKind: "sh:Literal", datatype: "rdf:langString" } },
  { id: "TextAreaWithLangEditor", name: "Text area (lang)", description: "Multi-line text with language tag", category: "Text", editor: "dash:TextAreaWithLangEditor", glyph: "¶₠", defaults: { nodeKind: "sh:Literal", datatype: "rdf:langString" } },

  // References
  { id: "URIEditor", name: "URI", description: "IRI / link input", category: "References", editor: "dash:URIEditor", glyph: "↗", defaults: { nodeKind: "sh:IRI" } },
  { id: "AutoCompleteEditor", name: "Auto-complete", description: "Search instances by class", category: "References", editor: "dash:AutoCompleteEditor", glyph: "⌕", defaults: { nodeKind: "sh:IRI", class: "foaf:Agent" } },
  { id: "InstancesSelectEditor", name: "Instances select", description: "Drop-down of class instances", category: "References", editor: "dash:InstancesSelectEditor", glyph: "▼", defaults: { nodeKind: "sh:IRI" } },
  { id: "DetailsEditor", name: "Details (nested)", description: "Embedded sub-form", category: "References", editor: "dash:DetailsEditor", glyph: "▢", defaults: { nodeKind: "sh:BlankNodeOrIRI" } },
  { id: "BlankNodeEditor", name: "Blank node", description: "Blank-node value, delete-only", category: "References", editor: "dash:BlankNodeEditor", glyph: "◇", defaults: { nodeKind: "sh:BlankNode" } },
  { id: "SubClassEditor", name: "Sub-class", description: "Select a subclass of a root class", category: "References", editor: "dash:SubClassEditor", glyph: "⛉", defaults: { nodeKind: "sh:IRI" } },

  // Choice
  { id: "EnumSelectEditor", name: "Enumeration", description: "Choice from a fixed list", category: "Choice", editor: "dash:EnumSelectEditor", glyph: "◉", defaults: { nodeKind: "sh:Literal", datatype: "xsd:string", inValues: ["Option A", "Option B"] } },
  { id: "BooleanSelectEditor", name: "Boolean", description: "Yes / no toggle", category: "Choice", editor: "dash:BooleanSelectEditor", glyph: "☑", defaults: { nodeKind: "sh:Literal", datatype: "xsd:boolean" } },

  // Date & number
  { id: "DatePickerEditor", name: "Date picker", description: "Calendar selector", category: "Date & number", editor: "dash:DatePickerEditor", glyph: "◫", defaults: { nodeKind: "sh:Literal", datatype: "xsd:date" } },
  { id: "DateTimePickerEditor", name: "Date & time", description: "Date with time", category: "Date & number", editor: "dash:DateTimePickerEditor", glyph: "⏱", defaults: { nodeKind: "sh:Literal", datatype: "xsd:dateTime" } },
  { id: "NumberFieldEditor", name: "Number", description: "Numeric field", category: "Date & number", editor: "dash:TextFieldEditor", glyph: "№", defaults: { nodeKind: "sh:Literal", datatype: "xsd:integer" } },
];

export const WIDGET_BY_ID: Record<string, WidgetDef> = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

export const CATEGORIES: WidgetCategory[] = [...new Set(WIDGETS.map((w) => w.category))];

export const DATATYPES = [
  "xsd:string", "xsd:boolean", "xsd:integer", "xsd:decimal", "xsd:double",
  "xsd:date", "xsd:dateTime", "xsd:time", "xsd:anyURI", "rdf:HTML", "rdf:langString",
];

export const NODE_KINDS = [
  "sh:Literal", "sh:IRI", "sh:BlankNode", "sh:BlankNodeOrIRI", "sh:BlankNodeOrLiteral", "sh:IRIOrLiteral",
];

/**
 * Map a `dash:editor` IRI (+ datatype) back to a `widgetId`. `dash:TextFieldEditor`
 * with a numeric datatype is the Number widget; otherwise the editor IRI maps to
 * the one widget that declares it (falling back to its local name). Returns "" when
 * no editor was given, so the field carries no widget.
 */
export function widgetForEditor(editor: string | null, datatype: string | null): string {
  if (!editor) return "";
  if (editor === "dash:TextFieldEditor" && datatype && NUMERIC_DATATYPES.has(datatype)) {
    return "NumberFieldEditor";
  }
  const match = WIDGETS.find((w) => w.editor === editor && w.id !== "NumberFieldEditor");
  return match?.id ?? (editor.split(":")[1] ?? editor);
}
