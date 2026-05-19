# Claude Design prompts

Four prompts, one per user-facing surface, ready to paste into Claude Design. Each is self-contained — Claude Design does not see the rest of this repository, so anything it needs to know has to be in the prompt itself.

## How to use these

The recommended flow for each surface:

1. In Claude Design, **create a new project** for the surface (e.g., "FDP Metadata Browser"). One project per surface keeps the canvas focused; cross-surface consistency comes from the shared design system, not from cramming everything into one project.
2. **Add context before prompting.** Upload the screenshots referenced in the prompt (existing FDP UI, the ProjectOak SHACL editor, any analytics dashboards you like the look of) and, if you have one, link a code repository so Claude Design picks up your component patterns.
3. **Paste the prompt as the first message.** Claude Design produces a starting point on the canvas.
4. **Iterate.** Use inline comments on the canvas for targeted tweaks ("smaller button padding", "use the secondary brand colour here") and chat for structural changes ("rearrange so search is at the top, results below"). The Claude Design getting-started guide is clear that inline comments are faster for component-level fixes; chat is for layout shifts and new sections.
5. When the design lands, **export and hand off to Claude Code** to implement against the existing scaffold in this repo.

A few tips from the Claude Design docs worth applying to all four prompts: start simple and add complexity through iteration; ask for 2–3 alternative layouts when you're unsure; ask Claude Design to review the result for accessibility and contrast before finalising.

The prompts below intentionally leave visual style undirected. Your design system (configured separately in Claude Design) handles brand, palette, and typography. The prompts describe what the surface *does*, not what colour it should be.

---

## Prompt 1 — Metadata browser

> **Goal**
>
> Design the primary surface where a user discovers and opens metadata records in a FAIR Data Point. Records describe datasets, biobanks, organisations, publications, and other FAIR resources, structured as RDF and grouped into nested LDP containers (Repository → Catalogs → Datasets → Distributions).
>
> **Audience**
>
> Two main users with overlapping needs. Researchers who arrived via a search engine or a colleague's link and want to evaluate whether a specific record is what they're looking for, scan related records, and reach the underlying data. Data stewards from the same institution who use this surface for the same purpose plus their own curation work — they need the standard browse and search but also need to recognise records they own and reach the edit affordances quickly.
>
> **Layout**
>
> Three regions. Left: a collapsible tree of the container hierarchy with the current container highlighted. Centre: the main content — either a list of records in the current container, search results, or a single record's detail view. Right: a context panel that adapts to the centre (filters when listing/searching; metadata-about-metadata, available distributions, and related records when viewing one). Header carries the search input prominently because search outpaces tree-walking for most users. Empty states matter: a new FDP deployment looks empty, and the empty state should guide the first steward to create their first catalog.
>
> **Content**
>
> Record cards in lists show: title, the type (Dataset, Biobank, etc.), 1–2 lines of description, key facets (keywords, themes), last-modified date, and a small badge for restricted records the user can see. Record detail view shows: title, description, full property table, available distributions with download/query affordances per distribution, the effective access policy in plain language with "view as ODRL" affordance, and the meta-metadata block (creator, dates, version) in the right panel. Search results show the same cards as lists but with matched terms highlighted and the relevance signal indicated subtly. Faceted filters cover resource type, keywords, themes, modification date.
>
> **Variations to consider**
>
> Show me 2–3 layouts: (a) tree-and-detail with everything on one page, (b) tree-then-results-then-detail with the right panel hiding by default, (c) a two-pane layout with no permanent tree (tree opens as an overlay).
>
> **Constraints**
>
> Anonymous users see public records only — design has to work without an authenticated identity in the header. Records can have access conditions: don't show "locked" icons that imply the record exists but is hidden; restricted records the user can't see are simply not in the results. Records the authenticated user *can* see but that are non-public to others get a discreet badge. The right panel must accommodate viewing the record's RDF in multiple serialisations (Turtle, JSON-LD, RDF/XML, N-Triples) — design a "view as" affordance that doesn't dominate.

---

## Prompt 2 — Visual SHACL editor

> **Goal**
>
> Design a visual editor where a data steward defines or modifies a SHACL schema using a node-based canvas. The schema is RDF; the editor's job is to make it feel like an information model rather than a graph of triples. Functionally similar to [ProjectOak](https://github.com/luizbonino/ProjectOak) — node-based, shapes as nodes — but the UX should fit a modern web application rather than copy ProjectOak's specific look.
>
> **Audience**
>
> Data stewards who understand their domain (clinical metadata, biobank descriptions, etc.) and have a working knowledge of RDF but are not SHACL experts. They are comfortable being shown raw Turtle when they ask for it, but the canvas-based view should be their primary mode of interaction. They iterate: build a draft, test it against sample data, refine, repeat.
>
> **Layout**
>
> Three-part screen. Left: a collapsible palette of shape types and a list of shapes in the current schema (clickable to focus the canvas). Centre: the canvas — each `sh:NodeShape` is a node showing its target class and a count of properties; edges between nodes represent `sh:node` or `sh:class` references between shapes. Right: an inspector panel that changes based on what's selected — node properties when a shape is selected, constraint details when an individual property within a shape is selected, validation results when a "test against data" run is active. Bottom: a collapsible panel toggling between a live Turtle preview of the current schema and a sample-data validation result.
>
> **Content**
>
> A shape node shows: shape name, target class, property count badge, a "constrained by" indicator if it inherits, and small affordances for "open" and "delete". The inspector for a selected shape shows the properties as a sortable list — for each property: path (predicate), datatype, cardinality (min/max), value range, regex pattern if any, and a small "remove" control. Adding a property opens a guided form. Adding a constraint to a property opens an in-place editor with a vocabulary picker for the constraint kind. The Turtle preview pane updates live as the canvas changes.
>
> **Specific interaction details that matter**
>
> Stewards drag to position nodes; positions are UI state only — they don't go into the schema. Connecting two nodes (drag from one to another) creates a `sh:node` constraint between them and prompts for the property path. Right-clicking a node opens a context menu with "duplicate", "rename", "view as Turtle", "delete". Selecting a property opens that property's constraint editor inline in the right panel. The "validate against sample data" affordance lives in the toolbar; clicking it opens a side drawer with a Turtle input box, runs the validation when the user pastes data, and overlays violation markers on the relevant nodes.
>
> **Variations to consider**
>
> Show me how the inspector panel looks when a shape is selected vs. when a single property within a shape is selected — those are the two most common steward tasks and they should both feel direct.
>
> **Constraints**
>
> The editor must support exporting and importing Turtle losslessly for the subset of SHACL it covers. The editor is not the source of truth on what is valid SHACL — the server validates on save and returns structured violations. Surface those violations inline on the relevant nodes/properties, not as a toast. Schemas can be large (dozens of shapes); the canvas needs to handle that without becoming a hairball — include a minimap and a "fit to view" control. Show me an empty-state design too: a steward opening the editor for a brand-new schema sees an empty canvas with clear guidance on how to add the first shape.

---

## Prompt 3 — Visual ODRL editor

> **Goal**
>
> Design a guided form-based editor where a data steward authors an access policy for a metadata record. The policy is expressed in W3C ODRL — specifically a `Set` policy containing Permission and Prohibition rules — and the FDP enforces a profile (subset) of ODRL that the editor must respect. This is intentionally not a canvas-based editor like the SHACL one: ODRL policies are small structured documents, not graphs, and a guided form fits them better.
>
> **Audience**
>
> Data stewards who understand the access decisions they need to express ("only people in our institution can read this dataset, nobody outside can modify it, public can see metadata after the embargo lifts") but who do not know ODRL syntax and shouldn't have to. The editor's job is to translate human-sensible intentions into valid ODRL.
>
> **Layout**
>
> Two regions, side-by-side. Left: the form — the editing surface. Right: a live preview of the resulting RDF (Turtle), collapsible. The form is structured as a vertical sequence: a brief description field at the top, then a "Permissions" section, then a "Prohibitions" section, then a "Conflict resolution" picker, then save/cancel actions. Each rule (Permission or Prohibition) is a card that expands to reveal its action and constraints. Adding a rule appends a new card at the bottom of the section.
>
> **Content**
>
> A rule card collapsed shows: rule type (Permission/Prohibition), action (Read/Modify/Delete/Distribute), a 1-line plain-English summary of the constraints ("for users in 'biobank-admin' role"), and a remove control. Expanded, the card shows: action selector (dropdown limited to the FDP profile: read, modify, delete, distribute), then a constraints sub-list where each constraint specifies (a) the constraint type (party identity, role membership, organisation membership, time window), (b) the operator (equals, not-equals, before, after, between), and (c) the value (a URI picker for party/role/org, a date picker for time windows). The conflict picker is two radio buttons — "Deny wins (recommended)" and "Permit wins" — with a one-sentence explanation of each. Default is "Deny wins".
>
> **Specific interactions**
>
> Adding a constraint: the constraint-type selector shows only the four types in the FDP profile; selecting one reveals the operator and value inputs appropriate for that type. The value input is a typeahead-style picker for URI-typed values (party, role, org) that suggests known values from the deployment's vocabulary; a freeform URI input is available behind a "use a custom URI" affordance. The plain-English summary on the collapsed card is generated from the rule's content — when a steward changes the rule, the summary updates. The Turtle preview on the right updates live and is selectable so a steward can copy it if they want.
>
> **Variations to consider**
>
> Show me what the editor looks like (a) for a record with no policy yet (empty state — explain that the record will inherit from its parent container's policy unless one is set here), (b) for a record with a simple "public read, steward modify" policy (the most common case), and (c) for a record with a more complex policy that has three rules and a mix of constraint types.
>
> **Constraints**
>
> The editor must not allow constructing policies outside the FDP profile. No "purpose" constraint, no "spatial" constraint, no "industry" constraint, no Duty rules. If a steward tries to load an existing policy that uses unsupported features, the editor shows it in read-only mode with a clear explanation rather than silently dropping features. Versioning matters: editing a policy creates a new version on save; the editor should make it clear that "save" produces a new immutable version, not an edit-in-place. Show me a small affordance for "view version history" near the save button.

---

## Prompt 4 — Metrics dashboard

> **Goal**
>
> Design a usage-analytics dashboard for a FAIR Data Point. The dashboard shows how the FDP's resources are being used: views, downloads, search activity, SPARQL query volume, geographic distribution of visitors, unique visitors per day. The data behind it is anonymised by design — there is no per-user breakdown available and there cannot be one.
>
> **Audience**
>
> Two main users with different views of the same dashboard. Data stewards see metrics for the resources they own — "my catalog is getting traffic, my dataset is being viewed, my schema is being adopted by other deployments". They use this to demonstrate impact and to spot underperforming resources. Administrators see system-wide aggregates — total traffic, geographic spread, system load — and use it for capacity planning and reporting. Researchers occasionally look at metrics to see whether a resource is widely used (signal of quality), but they are a tertiary audience.
>
> **Layout**
>
> A top filter bar (date range — last 7 days / 30 days / 90 days / custom; scope — "my resources" for stewards, "all" for admins), then a responsive grid of cards. Top row: four KPI cards (total views, total downloads, unique visitors this period, SPARQL queries) with sparklines. Second row: two larger charts — a time-series of activity by day, and a horizontal bar chart of top resources. Third row: a world-map of visitor geography (country-level shading), and a time-of-day heatmap (day of week × hour). Fourth row: top search terms (only if the deployment has opted in to k-anonymous search analytics; otherwise omit this card with a single-line explanation in its place).
>
> **Content**
>
> KPI cards: large number, sparkline behind or below, comparison to the previous comparable period (+12% vs. previous 7 days). Time-series chart: stacked area showing views, downloads, queries. Top-resources bar: title, resource type icon, count, clickable to drill into a per-resource view. Geographic map: country-shaded chloropleth with hover tooltips; no city-level pins because that's more identifying than the data warrants. Heatmap: simple grid with colour intensity. Empty state for a freshly deployed FDP: friendly message explaining metrics will appear within an hour of the first traffic, with a small status indicator of the metrics pipeline health.
>
> **Specific interactions**
>
> Clicking a top-resources bar drills into a per-resource page (a different design — a focused view of one resource's metrics over time). Hovering a country on the map shows the count and the per-period change. The date-range picker is a typical preset-plus-custom widget. No "export raw data" affordance — the privacy design rules out per-event export; the dashboard can have a "save as PDF" or "save as image" of the current view if useful.
>
> **Variations to consider**
>
> Show me the layout (a) for a steward viewing their own resources with healthy traffic, (b) for an administrator viewing system-wide on a busy deployment, (c) for a freshly deployed FDP with no traffic yet (the most important empty state to get right — sets the tone for an empty deployment).
>
> **Constraints**
>
> The data is anonymous by design. No per-user breakdown is available or possible. No cookies, no tracking identifiers. The dashboard must not imply that finer-grained data is hidden behind a "show more" — what you see is what exists. The "top search terms" feature requires k-anonymity protection and is opt-in per deployment; design the card so its absence on a deployment that opted out is not a hole in the layout but a deliberate choice. The geographic map shows country-level only — no city-level data, even though the backend has it, because city-level on a slow day can be identifying.

---

## What to do with the output

For each surface, when Claude Design produces a result you're happy with:

1. **Save the project** in Claude Design with a clear name (e.g., "FDP-metadata-browser-v1") so you can come back to it.
2. **Hand off to Claude Code** using the "Handoff to Claude Code" export option in Claude Design's export menu — this packages the design in a form Claude Code can implement against. Both "Send to local coding agent" and "Send to Claude Code Web" are valid depending on where you're working.
3. **Commit any extracted design tokens** (colours, spacing, type scale) into the client's `src/styles/main.css` — the file currently has placeholder values waiting to be replaced.
4. **Update the relevant view file** in `src/views/` from the scaffold stub to the implementation Claude Code produces from the Claude Design handoff. The view files are intentionally minimal so they don't collide with what Claude Design generates.

Iterate before committing. The first generation is rarely the final one — Claude Design's own getting-started guide emphasises this, and the four surfaces above are complex enough that 3–5 rounds of refinement per surface is realistic.
