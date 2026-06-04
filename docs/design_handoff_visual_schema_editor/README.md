# Handoff: Visual Metadata Schema Editor (SHACL form designer)

## Overview

The FDP Client lets data stewards define metadata schemas as **SHACL shapes**. Today the only way to author a schema is to hand-write SHACL/Turtle into a single textarea (`SchemaDetail` view, "Definition" tab). This requires the author to know SHACL.

This feature adds a **third tab — "Visual Editor"** — to the schema editor. It is a drag-and-drop form designer: the steward drags **DASH form widgets** (https://datashapes.org/forms.html) from a palette onto a canvas, arranges them into groups, and edits each field's properties in an inspector. The tool generates the equivalent SHACL automatically.

The three tabs are three views of **one shared schema model** and stay **bidirectionally synced**:

| Tab | Role | Direction of sync |
|-----|------|-------------------|
| **SHACL** (renamed from "Definition") | Write/inspect Turtle directly in a code editor | edits → parse → model → updates the other two tabs |
| **Visual Editor** (new) | Compose the form by drag-and-drop | edits → model → regenerates Turtle in the SHACL tab |
| **Form Preview** | A live, fillable form generated from the model, used to *test* the schema | read-only (renders the model); has a "Validate record" check |

> The first tab was renamed **Definition → SHACL**. All manual SHACL editing happens there; the Visual Editor no longer shows a separate code block.

---

## About the design files

The files in this bundle are **design references built in HTML/React (Babel JSX in the browser)**. They are a **prototype of look and behavior, not production code to copy**. The FDP Client is **Vue 2 + TypeScript** (class-style components via `vue-property-decorator`, Vuelidate, `vue-prism-editor`, `rdflib`, SCSS). 

**Your task is to recreate this design inside the existing FDP Client using its established patterns** — Vue single-file components, the existing `ShaclForm` parser infrastructure, the existing SCSS variables, and the existing API layer. Do **not** port React or add React to the project. Use the HTML files only to understand the intended UI, layout, and behavior.

## Fidelity

**High-fidelity.** Colors, typography, spacing, component styling, copy, and interactions are all final and map directly onto the FDP Client's existing SCSS design tokens (see **Design Tokens**). Recreate the UI faithfully using those tokens — most values in the prototype's `style.css` are 1:1 with `src/scss/_variables.scss`, so prefer the SCSS variables over the literal hex values.

---

## Where this lives in the codebase

| Concern | Existing file | Change |
|---|---|---|
| Schema editor view + tabs | `src/views/SchemaDetail/index.vue` | Rename "Definition"→"SHACL"; add "Visual Editor" tab; wire shared model |
| SHACL → fields parser (reuse!) | `src/components/ShaclForm/Parser/SHACLFormParser.ts`, `SHACLParser.ts` | Reuse for parsing; may extend |
| Form rendering (reuse for Preview) | `src/components/ShaclForm/FormRenderer.vue`, `FormInput.vue` | Reuse as-is for the Form Preview tab |
| Editor widget dispatch | `src/components/ShaclForm/FormInput.vue` | Reference for the widget↔`dash:editor` mapping |
| RDF namespaces & prefixes | `src/rdf/namespaces.ts` | Reuse `DASH`, `SHACL`, `RDF`, `RDFS`, `PREFIXES` |
| Design tokens | `src/scss/_variables.scss` | Reuse; no new colors |
| **NEW: SHACL serializer** | — | **Must be written** (the FE only has a parser today) |

### Critical reuse note
The codebase already has a robust **SHACL → model parser** (`SHACLFormParser`, built on `rdflib`). It does **not** have a **model → SHACL serializer**. The prototype includes a hand-rolled tokenizer/parser only because it had no `rdflib`; **in the real client, do not reimplement parsing — reuse `SHACLFormParser`** (and extend it to surface the extra constraint terms listed below). You only need to **write the serializer** (model → Turtle), modeled on the prototype's `shacl.jsx`.

---

## Screens / Views

### Page chrome (already exists)
The view sits inside the existing `Breadcrumbs` + `Page` components with title "Edit {name}" / "Create Metadata Schema". The prototype reproduces the FDP header/breadcrumb only for context — **don't rebuild chrome**, just the tab content.

### Tab bar
Existing markup pattern in `SchemaDetail/index.vue`:
```
ul.nav-tabs > li.nav-item > a.nav-link(.active)
```
Three tabs, in order:
1. **SHACL** — icon: code/`</>`. Show a small red dot on the tab when the current Turtle fails to parse.
2. **Visual Editor** — icon: wand/sparkle. Append a small "NEW" pill (background `$color-complementary` `#EFC700`, dark text, uppercase, pill radius).
3. **Form Preview** — icon: eye.

Keep `white-space: nowrap` on `.nav-link` so labels never wrap.

---

### Screen 1 — SHACL tab

**Purpose:** author/inspect the schema as Turtle.

**Layout (top → bottom):**
1. **Info callout** (one line): white card, left border `4px solid #EFC700`, light blue border otherwise, radius 6px, padding 10–14px. Copy:
   > **SHACL source** — write the metadata schema directly in Turtle. Every edit is parsed live and reflected in the **Visual Editor** and **Form Preview**. Likewise, changes you make in the Visual Editor are written back here.
2. **Code card** (white, 1px `$color-separator` border, radius 10px):
   - **Header row** (padding 10×14, bottom border): left = "FORM DEFINITION · TURTLE" (11px, 700, letter-spacing 1.2px, uppercase, `$color-text-lighter`); right = a **status pill** + **Tidy** + **Copy** ghost buttons.
     - Status pill when valid: green (`#e9f5ee` bg / `$color-success` text), text "✓ Synced · N properties".
     - Status pill when invalid: red (`#fdecec` bg / `$color-danger` text), text "✕ Invalid SHACL".
   - **Code editor:** height ~520px, monospace 13px, line-height 1.7, padding 16×18, background `#FBFCFD`. Syntax-highlighted Turtle. Tab key inserts 2 spaces.
   - **Error strip** (only when parse fails): full-width row under the editor, `#fdecec` bg, `$color-danger` text, monospace, shows the parser error message + the note "— the form keeps the last valid version until this is fixed."
3. **Actions bar:** left = summary ("Target class … · N groups"); right = **Cancel**, **Save**, **Save and release** buttons. Save buttons disabled while parse is invalid.

**Implementation in Vue:** The existing tab uses `vue-prism-editor` with `language="turtle"`. Keep using it (it already provides Turtle highlighting) bound to the shared Turtle string. The prototype's custom highlight overlay is **not** needed — `vue-prism-editor` covers it. On every change, attempt to parse; on success update the model, on failure set an error and keep the last good model.

---

### Screen 2 — Visual Editor tab (the core feature)

**Purpose:** compose the form visually.

**Layout:** info callout (same style as above, Visual-Editor copy) then a **3-column CSS grid workbench**:
```
grid-template-columns: 268px minmax(360px, 1fr) 340px;
gap: 16px;
min-width: 1140px;   /* page scrolls horizontally below this; never crush columns */
min-height: 720px;
```
Each column is a **panel**: white, 1px `$color-separator` border, radius 10px, with a header (title 11px/700/uppercase/letter-spacing + optional subtitle) and a scrollable body.

#### Column A — Widget palette (`268px`)
- Panel title "WIDGETS", subtitle "Drag to canvas · DASH".
- **Search box** (filters by name/description/editor IRI).
- Widgets grouped by category label (uppercase, 10px). Categories: **Text**, **References**, **Choice**, **Date & number**.
- Each **palette item**: `draggable`, 9–10px padding, radius 6px; left a 32px rounded icon tile (`$color-primary-tint` bg, primary glyph), then name (13px/600) + description (11px, `$color-text-lighter`). Hover = tint bg + soft border; `cursor: grab`.
- A tweak/toggle can hide descriptions (optional; default on).

**Widget list** (name → `dash:editor` → default constraints):

| Category | Name | `dash:editor` | Default `sh:nodeKind` | Default `sh:datatype` / `sh:class` | Notes |
|---|---|---|---|---|---|
| Text | Text field | `dash:TextFieldEditor` | `sh:Literal` | `xsd:string` | |
| Text | Text area | `dash:TextAreaEditor` | `sh:Literal` | `xsd:string` | |
| Text | Rich text | `dash:RichTextEditor` | `sh:Literal` | `rdf:HTML` | |
| References | URI | `dash:URIEditor` | `sh:IRI` | — | |
| References | Auto-complete | `dash:AutoCompleteEditor` | `sh:IRI` | `sh:class foaf:Agent` | search by class |
| References | Instances select | `dash:InstancesSelectEditor` | `sh:IRI` | — | |
| References | Details (nested) | `dash:DetailsEditor` | `sh:BlankNodeOrIRI` | — | embedded sub-form |
| Choice | Enumeration | `dash:EnumSelectEditor` | `sh:Literal` | `xsd:string` | seeds `sh:in` with 2 options |
| Choice | Boolean | `dash:BooleanSelectEditor` | `sh:Literal` | `xsd:boolean` | |
| Date & number | Date picker | `dash:DatePickerEditor` | `sh:Literal` | `xsd:date` | |
| Date & number | Date & time | `dash:DateTimePickerEditor` | `sh:Literal` | `xsd:dateTime` | |
| Date & number | Number | `dash:TextFieldEditor` | `sh:Literal` | `xsd:integer` | same editor as Text field; disambiguate by numeric datatype |

> These editor IRIs match what `FormInput.vue` already dispatches on (`field.editor === DASH('…Editor').value`). "Number" reuses `dash:TextFieldEditor`; on the way back from SHACL, classify a `TextFieldEditor` with a numeric datatype (`xsd:integer/decimal/double/float/long`) as the Number widget, otherwise Text field.

#### Column B — Canvas (`minmax(360px, 1fr)`)
- Panel header "FORM CANVAS", subtitle "N properties in M groups", plus an **Add group** secondary button.
- **Schema banner** (clickable card at top): primary 36px icon tile, schema name (15px/700) + sub `sh:NodeShape · sh:targetClass <value>` (mono, `$color-text-lighter`), and a "Schema settings" ghost button. Selecting it shows schema settings in the inspector. Selected state = primary border + soft ring.
- **Group cards** (one per `sh:PropertyGroup`): header in `$color-primary-tint` with a layers icon, an **inline-editable title input** (the group label), and a delete (trash) button. Body holds field cards; empty body shows a dashed "Drop a widget here" placeholder.
- **Field cards** (one per `sh:property`): row with a **drag grip** (left, `draggable`), a 32px widget icon tile, main area (name 14px/600 + a red ● when required + a "multi" badge when `maxCount ≠ 1`; meta line = mono `path · datatype|class|editor`), and hover actions (duplicate, delete). Click selects → inspector. Selected = primary border + ring.
- **Empty canvas** state: dashed card, wand icon, "Drop widgets here to design your form".
- **Drop indicators:** a 3px primary bar shows the insertion point between field cards; an empty group highlights as a dashed tinted box.
- Bottom: "Add another group" ghost button + actions bar (Synced status + Cancel/Save/Save and release).

#### Column C — Inspector (`340px`)
Context-sensitive; shows one of:

**Field inspector** (when a field card is selected):
- Header tile with widget icon, widget name, and the `dash:editor` IRI (mono, primary).
- **Basic** section: Label (`sh:name`, required), Description (`sh:description`, textarea), Property path (`sh:path`, mono, required, e.g. `dct:title`).
- **Constraints** section: Min count / Max count (`sh:minCount`/`sh:maxCount`, 2-up); Node kind (`sh:nodeKind` select from the list below); **if Literal** → Datatype (`sh:datatype` select) + Min/Max length (`sh:minLength`/`sh:maxLength`) + Pattern (`sh:pattern`, regex); **if IRI** → Class (`sh:class`, mono); **if Enumeration** (or any field with `sh:in`) → **Allowed values** tag editor (`sh:in` list — Enter to add a chip, × to remove).
- **Defaults & order** section: Default value (`sh:defaultValue`), Order (`sh:order`), and a read-only Group field (note: move a field by dragging it into another group).

**Group inspector** (when a group header is selected): Label (`rdfs:label`), Order (`sh:order`), Delete group.

**Schema inspector** (default / schema banner selected):
- **Identity:** Schema name, Description (these map to the existing form's Name/Description and to `rdfs:label`/`rdfs:comment` on the shape — see serializer).
- **Shape definition:** Shape IRI (mono, e.g. `:DatasetShape`), Target class (`sh:targetClass`, mono, required, e.g. `dcat:Dataset`).
- **Vocabularies:** a **prefix table** editor (prefix → URI rows, add/remove). Seed with the namespaces from `src/rdf/namespaces.ts` `PREFIXES`.

**Selects use these option sets:**
- `sh:nodeKind`: `sh:Literal`, `sh:IRI`, `sh:BlankNode`, `sh:BlankNodeOrIRI`, `sh:BlankNodeOrLiteral`, `sh:IRIOrLiteral`
- `sh:datatype`: `xsd:string`, `xsd:boolean`, `xsd:integer`, `xsd:decimal`, `xsd:double`, `xsd:date`, `xsd:dateTime`, `xsd:time`, `xsd:anyURI`, `rdf:HTML`, `rdf:langString`

---

### Screen 3 — Form Preview tab

**Purpose:** test the schema by filling in the auto-generated form.

- **Reuse the existing `FormRenderer.vue`** — it already renders a SHACL form via `SHACLFormParser`. Feed it the current (synced) Turtle so the steward tests exactly what end users will see. The prototype's hand-rolled renderer exists only because the prototype couldn't import `FormRenderer`.
- Add a thin wrapper: info callout (Form-Preview copy, mentions the `sh:targetClass`), and a **"Validate record"** action that checks required fields (`sh:minCount > 0`) are non-empty, then shows a banner: green "All required fields are filled — this record would validate against the schema." or red "N required fields still need a value." and highlights the empty required inputs with a red border. A **Clear** button resets the test values.
- These test values are **throwaway** (local component state) — they are not persisted to the schema.

---

## Interactions & Behavior

### Bidirectional sync (the defining behavior)
Single source of truth = the **schema model** (see State Management). Keep the Turtle string and the model in sync via two one-way paths (no circular effects):

- **Visual Editor edit** → mutate model → run **serializer** → set Turtle string → clear parse error.
- **SHACL edit** (textarea `@input`) → set Turtle string → run **`SHACLFormParser`** (+ constraint extraction) → on success replace model & clear error; on failure set error and **keep the previous valid model** (form/preview unchanged).
- **Form Preview** never mutates the schema.

Edge: while the Turtle is invalid, switching to the Visual Editor and editing there will re-serialize and overwrite the invalid text with valid Turtle. This is intended.

### Drag and drop (Visual Editor)
- **Palette → canvas:** drag a widget onto a group body or between field cards. On drop, create a new field from the widget's defaults (auto name from widget, auto path `:lowercasename`) and insert at the drop index. Use the `position` (before/after based on pointer Y vs card midpoint) to compute the insertion point.
- **Field → field/group:** drag an existing field by its grip to reorder within a group or move it to another group. On drop, remove from origin, insert at target, then renumber `sh:order` within affected groups.
- Show the 3px insertion bar during hover; show a dashed highlight on empty group bodies.
- HTML5 DnD is fine (the prototype uses it). If the team prefers, `vuedraggable` (SortableJS) is an acceptable substitute and may be cleaner in Vue — either is OK as long as the cross-group move + palette-create behaviors match.

### Selection
Clicking a field, a group header, or the schema banner sets the inspector context. Clicking empty canvas resets to the schema inspector. After a successful SHACL re-parse, reset selection to the schema (field IDs are regenerated).

### Validation (existing + new)
- Keep the existing Vuelidate rules on Name/Target/Definition in `SchemaDetail`.
- The model is only committed to `schema.definition` as Turtle; **Save** posts via the existing `api.metadataSchemas.post/putDraft` exactly as today. The visual editor changes *what* goes into `schema.definition`, not *how* it's saved.

---

## State Management

The shape of the shared model (TypeScript-ish):

```ts
interface SchemaModel {
  schemaName: string          // → rdfs:label on the NodeShape (and the form's Name field)
  schemaDescription: string   // → rdfs:comment on the NodeShape (and Description field)
  shapeIri: string            // e.g. ":DatasetShape"
  targetClass: string         // e.g. "dcat:Dataset" → sh:targetClass
  prefixes: { prefix: string; uri: string }[]
  groups: Group[]
}
interface Group {
  id: string                  // client-only id
  label: string               // → rdfs:label on sh:PropertyGroup
  order: number               // → sh:order
  fields: Field[]
}
interface Field {
  id: string                  // client-only id
  widgetId: string            // palette widget key (determines dash:editor)
  name: string                // sh:name
  description: string         // sh:description
  path: string                // sh:path  (prefixed, e.g. dct:title)
  nodeKind: string | null     // sh:nodeKind
  datatype: string | null     // sh:datatype
  class: string | null        // sh:class
  minCount: number | null     // sh:minCount
  maxCount: number | null     // sh:maxCount  (null = unbounded → omit)
  minLength: number | null    // sh:minLength
  maxLength: number | null    // sh:maxLength
  pattern: string             // sh:pattern
  defaultValue: string        // sh:defaultValue
  inValues: string[] | null   // sh:in ( … )
  order: number               // sh:order
}
```

State transitions:
- `mutate(fn)` clones the model, applies `fn`, sets model, re-serializes Turtle. Used by every Visual Editor action (add/move/delete/duplicate field, add/rename/delete group, edit any inspector field, edit schema settings).
- `onShaclChange(text)` sets Turtle, parses → model (or error).
- Data fetching is unchanged: `fetchData()` loads the draft; on entry, parse the loaded `schema.definition` into the model. On save, serialize and submit.

---

## SHACL serialization rules (model → Turtle) — **must implement**

Mirror the prototype's `shacl.jsx` (`generateShacl`). Output order:

1. `@prefix` lines for every entry in `model.prefixes`, plus `@prefix : <http://fairdatapoint.org/> .` (the `DEFAULT_URI` already in `namespaces.ts`).
2. One block per group:
   ```turtle
   :<LabelNoSpaces>Group a sh:PropertyGroup ;
     rdfs:label "<label>" ;
     sh:order <n> .
   ```
3. The node shape:
   ```turtle
   :<ShapeIri> a sh:NodeShape ;
     rdfs:label "<schemaName>" ;
     rdfs:comment "<schemaDescription>" ;      # only if present
     sh:targetClass <targetClass> ;
     sh:property [ … ] ;                        # one per field, in group/order
     sh:property [ … ] .                        # last ends with '.'
   ```
4. Each `sh:property` blank node emits, in this order, only the terms that are set: `sh:path`, `sh:name`, `sh:description`, `sh:nodeKind`, `sh:datatype`, `sh:class`, `sh:minCount`, `sh:maxCount`, `sh:minLength`, `sh:maxLength`, `sh:pattern`, `sh:defaultValue`, `sh:in ( "a" "b" )`, `sh:order`, `dash:editor <editor>`, `sh:group :<…>Group`.

String escaping: escape `\`, `"`, and newlines. Numbers unquoted. `sh:in` is an RDF list of quoted literals.

**Round-trip must be stable:** `parse(serialize(model))` ≡ `model`, and `serialize(parse(turtle))` is idempotent for turtle this tool produced. The prototype verifies this; replicate the test. Because the serializer writes `rdfs:label`/`rdfs:comment`, the parser must read them back into `schemaName`/`schemaDescription`.

### Extending the parser
`SHACLFormParser` already reads `name, description, path, datatype, order, minCount, maxCount, nodeKind, class, editor, defaultValue, minLength, maxLength, in`, plus `group` (label + order) — that covers almost everything above. Add extraction for `sh:pattern`, the shape's `rdfs:label`/`rdfs:comment`, the shape IRI, and the declared `@prefix` set, and map `dash:editor` (+ numeric datatype heuristic) back to a `widgetId`.

---

## Design Tokens

All map to `src/scss/_variables.scss` — **use the SCSS variables, not raw hex.**

| Token | SCSS var | Value |
|---|---|---|
| Primary | `$color-primary` | `#00518E` |
| Primary darker | `$color-primary-darker` | `darken($color-primary,10%)` |
| Primary soft (bg) | `$color-background-primary` | `#BFD4E3` |
| Primary tint (icon tiles/hover) | *(add)* | `#E8F0F7` — derive (`lighten`/`mix`) if you don't want a new var |
| Complementary (NEW pill) | `$color-complementary` | `#EFC700` |
| Text default | `$color-text-default` | `#4A4A4A` |
| Text lighter (labels) | `$color-text-lighter` | `#9B9B9B` |
| Separator/border | `$color-separator` | `#DCDCDC` |
| Danger | `$color-danger` | `#900` |
| Success | `$color-success` | `#090` |
| Highlight bg | `$color-background-highlighted` | `#F1F1F1` |
| Font | `$font-family` | `'Open Sans', sans-serif` |
| Mono | `$font-family-mono` | `SFMono-Regular, Menlo, …` |
| Radius small | `$border-radius-small` | `.25rem` |
| Radius default | `$border-radius-default` | `.625rem` (≈10px — used for panels/cards) |
| Radius pill | `$border-radius-full` | `10rem` (pills/buttons) |
| Spacing | `$space-xs/sm/md/lg` | `.25 / .75 / 1 / 2.25 rem` |

Prototype-specific values to reproduce: panel radius 10px, card radius 6px, field/palette icon tiles 32px, monospace 12–13px in code & meta lines, status pills `#e9f5ee/#090` (ok) & `#fdecec/#900` (err). Buttons follow the existing `.btn .btn-primary .btn-secondary` pill style already in the app.

---

## Assets

- **Icons:** the app uses Font Awesome (`<fa :icon="[…]">`, see `src/font-awesome/index.ts`). Replace the prototype's inline SVGs with FA equivalents: code (`fa-code`), wand/sparkle (`fa-wand-magic-sparkles`), eye (`fa-eye`), layers (`fa-layer-group`), grip (`fa-grip-vertical`), plus/trash/copy/gear/times/check already in use. No raster assets are required.
- **Fonts:** Open Sans is already loaded by the app. No new fonts.
- No images.

---

## Files in this bundle (design reference)

### Annotated screenshots (`screenshots/`)
Reference renders of each tab with numbered callouts:

**`1-shacl-tab.png` — SHACL tab**
1. Tab renamed Definition → **SHACL** (red dot appears here on parse error)
2. Info callout explaining bidirectional sync
3. Status pill — green "Synced · N properties" / red "Invalid SHACL"
4. **Tidy** (re-serialize from model) + **Copy** ghost buttons
5. Syntax-highlighted, editable Turtle code editor (use `vue-prism-editor`)

**`2-visual-editor.png` — Visual Editor tab** *(zoomed to show all 3 columns)*
1. **Widget palette** column (search + categorized DASH widgets)
2. A draggable palette item (icon tile + name + description)
3. **Schema banner** — click to edit schema settings in the inspector
4. **Group card** header — inline-editable label + delete
5. **Field card** — grip, widget icon, name (red ● = required), `multi` badge, mono meta line
6. **Inspector** column (here showing Schema settings)

**`3-field-inspector.png` — Field selected**
1. Selected field card (primary border + ring)
2. Inspector field-head: widget name + `dash:editor` IRI
4. Inspector sections (Basic / Constraints / Defaults & order) with the SHACL-term-mapped controls

**`4-form-preview.png` — Form Preview tab**
1. Info callout naming the `sh:targetClass`
2. Validation banner (red when required fields empty / green when valid)
3. Group title rendered from `sh:PropertyGroup`
4. Required-field marker; empty required inputs get a red border on validate

### Source files
Open `Visual Schema Editor.html` to interact with the full prototype. Source split:

| File | What to read it for |
|---|---|
| `Visual Schema Editor.html` | Entry point / script load order |
| `style.css` | All visual styling & tokens (maps to SCSS vars) |
| `data.jsx` | **Widget catalog** (`WIDGETS`), option lists, default prefixes, and the seed Dataset schema |
| `shacl.jsx` | **Serializer** (`generateShacl`) + Turtle highlighter — the model→SHACL rules to replicate |
| `shacl-parse.jsx` | Reference parser (in the real client, **reuse `SHACLFormParser` instead**) |
| `palette.jsx` | Widget palette + icon set |
| `canvas.jsx` | Drag-and-drop canvas, group/field cards, reorder/move logic |
| `inspector.jsx` | Field/Group/Schema inspectors, prefix & `sh:in` editors |
| `preview.jsx` | Form Preview + validation (real client: wrap `FormRenderer.vue`) |
| `shacltab.jsx` | SHACL code tab + status pill |
| `app.jsx` | Tab wiring + the two-way sync (`mutate` / `onShaclChange`) |

### Suggested implementation order
1. Add the model + serializer; on load, parse `schema.definition` → model; on save, serialize → `schema.definition`. Verify round-trip stability against an existing schema.
2. Rename the tab to "SHACL"; wire `onShaclChange` (parse) and keep `vue-prism-editor`.
3. Build the Visual Editor: palette → canvas → inspector, with `mutate` re-serializing on every change.
4. Point Form Preview at the existing `FormRenderer.vue` fed by the synced Turtle; add the validate banner.
5. Extend `SHACLFormParser` for `sh:pattern`, shape label/comment, shape IRI, prefixes.
