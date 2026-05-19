# FDP v2 client — UX design brief

Use this brief to engage Claude on the UX design of the FDP v2 web client. Paste it into a new conversation (claude.ai Project, fresh chat, or wherever you do design work), attach the architecture document (`fdp-server/docs/architecture/README.md`) as context, and iterate from there.

The brief is structured so an AI assistant can produce useful work either in one pass or across many sessions. It covers context, constraints, the four design surfaces, personas, and the specific design questions that need answers first.

---

## How to use this brief

1. Open a new Claude conversation (a Project in claude.ai is ideal because the architecture doc stays attached across turns).
2. Attach `fdp-server/docs/architecture/README.md` from the server repo. The visual editor section (13) and the ODRL/SHACL discussions in Sections 8 and 10 are the most relevant to UX.
3. Paste the brief below, starting from "Project context".
4. Ask Claude for whatever you need first: information architecture, user flows, wireframes for one surface, a design-token proposal, accessibility audit of an approach, content strategy for empty states. The brief is the shared baseline; the conversation is the work.

The brief intentionally avoids prescribing visual style. Style is downstream of decisions about IA, primary tasks, and editor mechanics — get those right first, then layer aesthetics on.

---

## Project context

The FAIR Data Point (FDP) is a metadata repository for the FAIR data community. It holds machine-readable descriptions of datasets, biobanks, organizations, methodologies — whatever a community wants to describe through its own SHACL schemas. Consumers browse, search, and query the metadata; stewards curate it and define the access conditions.

The v2 client is a Vue 3 single-page application. The full architecture is documented in the attached `README.md` (15 sections). The most relevant parts for UX:

- **Section 3** — Four user roles (stewards, consumers, anonymous users, administrators)
- **Section 8** — ODRL policy model (Permissions, Prohibitions, the FDP profile)
- **Section 10** — LDP semantics (resources, containers, content negotiation, PATCH)
- **Section 11** — Anonymous metrics (what the dashboard shows, what it can't)
- **Section 13** — Client application (the four surfaces, tech choices)

The four user-facing surfaces of the client are:

1. **Metadata browsing and search** — discoverability of records
2. **Visual SHACL editor** — authoring schemas with a node-based canvas
3. **Visual ODRL editor** — authoring access policies through guided forms
4. **Metrics dashboard** — usage analytics

These four surfaces have very different interaction models. They should feel like one coherent product, but they don't need to use the same primary UI pattern.

---

## Constraints

These shape what's possible. They are not negotiable without going back to the server-side architecture.

**Technical**
- Vue 3 + TypeScript, Composition API
- PrimeVue for components and forms
- Vue Flow for canvas-based editors (SHACL)
- OIDC handles authentication directly between client and IdP; the client never sees a username/password form
- All persistent state is server-side; the client is stateless across reloads
- API contract is generated from the server's OpenAPI spec
- No `localStorage` or `sessionStorage` for user data
- No analytics cookies in the client itself

**Identity and roles**
- Users authenticate with an external OIDC provider — the client provides a "Sign in" button that redirects to the IdP; no registration screen, no password reset screen, no profile-editing screen
- The displayed user identity comes from the OIDC ID token (name, email, avatar if available); the FDP server itself stores no user profile data

**ODRL scope (Section 8 of architecture)**
- The ODRL editor must only let users build policies within the FDP profile: Permissions and Prohibitions; supported actions (`read`, `modify`, `delete`, `distribute`); supported constraints (party identity, role membership, organization membership, time windows). Excluded: Duties, purpose constraints, spatial constraints, payment, count.
- Policy types are Offers (versioned, immutable on edit — every edit creates a new version)

**Privacy posture (Section 11)**
- The metrics dashboard renders only what the anonymous server API returns. No re-identification UI, no per-user drill-down, no "users like you" suggestions.

**Accessibility**
- WCAG 2.2 AA is the floor, not the goal
- Keyboard-first interaction is mandatory in the SHACL editor; canvas-only mouse interaction is unacceptable
- Color is never the sole signal

**Scale and content**
- A typical FDP holds tens to thousands of records, not millions
- Records can be deeply nested (a Catalog containing many Datasets, each containing Distributions); the browsing UI must make this tractable
- Records can be authored in any natural language; the UI itself is English in v1, but record content is not

**What we are not designing**
- No mobile-first dedicated client; the SPA must be usable on tablet but stewardship is desktop work
- No offline mode
- No real-time collaborative editing in v1

---

## User personas

These are scaffolds for design thinking, not personas to memorize. Treat them as anchors and challenge them.

### The Data Steward — primary

Roles in their institution: research data manager, curator, librarian, domain expert wearing a metadata hat. They care about correctness, control, and audit-ability — when their colleagues ask "who can see what and why", they need an answer.

Typical tasks:
- Add a new dataset record by filling out a form generated from a SHACL schema
- Edit an existing record — often updating a single field
- Define a new schema for a record type the community needs (e.g., "patient registry")
- Set access conditions on a sensitive record
- Investigate "why can user X see record Y" or "why can't they"
- Review what got viewed this quarter for the annual report

What hurts them today: every change is a full-record round-trip; schemas are edited in raw `.ttl`; access control is implicit in the URL space; there's no audit trail.

### The Data Consumer — primary

Researchers, secondary-data analysts, federation engineers, downstream tool builders.

Typical tasks:
- Find datasets matching specific criteria (disease, time period, modality)
- Inspect a specific record to decide whether to use it
- Issue a SPARQL query for advanced filtering
- Download or get an access URL for the actual data
- Bookmark or cite a record (URIs are stable)

What helps them: fast search, faceted filtering on whatever the schema declares, clear distinction between "you can see this metadata" and "you can access the data", obvious next step for getting at the data.

### The Anonymous user — secondary

A casual visitor. May be a peer reviewer following a citation, a journalist, a student, an automated indexer.

Typical tasks:
- Land on a record from an external link and understand what it is
- Browse the public catalog
- Sign in if they want more (the FDP itself never asks why they're signing in)

What they need: graceful degradation. The same UI as authenticated consumers but with hidden records simply absent rather than shown as "locked".

### The Administrator — tertiary

Sysadmin or deployer. Spends most of their time in shell and config files, not the UI. Uses the UI for occasional sanity checks ("is the system healthy", "did the profile bootstrap correctly").

Not a primary persona for the client. Admin features in v1 are minimal — config and deployment happen out-of-band.

---

## The four surfaces

For each surface, the questions in *italics* are the design questions to answer first.

### Surface 1 — Metadata browsing and search

The default user journey. Most visits start here.

Building blocks:
- Catalog tree navigation (the LDP hierarchy: Repository → Catalogs → Datasets → Distributions, plus custom container types added by deployment profiles)
- Free-text search across the metadata
- Faceted search using whatever fields the deployment's schemas have marked as facets
- Record detail view with the RDF content rendered nicely, available in multiple serializations on demand
- SPARQL playground for advanced consumers
- Per-record provenance and access information visible to stewards
- Clear signal of what's open-access and what requires authentication or has restrictions

*Design questions:*
- How does navigation work when a deployment uses a profile with custom container types (a community might have `BiobankCollection → Biobank → Sample`)? The tree can't be hard-coded.
- How does faceted search adapt to schemas the client doesn't know in advance? Facets come from the server but the UI needs to handle "this deployment has 14 facets, that one has 3".
- How are records' RDF rendered for non-expert consumers? A consumer should see a useful page; a developer should be able to switch to Turtle or JSON-LD with one click.
- How does the SPARQL playground present query results that may include hundreds of variables and thousands of rows, while making it obvious what was filtered by access control vs. genuinely absent?
- How is "this record exists but you can't see all of it" represented when the server permits the user to see some triples but not others? (Note: with our one-graph-per-record model, this is mostly all-or-nothing per record, but downloadable data may have separate restrictions.)

### Surface 2 — Visual SHACL editor

The most distinctive surface. Functional reference: [ProjectOak](https://github.com/luizbonino/ProjectOak). UX is designed for this app, not copied.

A SHACL schema declares what a record of a given type must contain — required properties, allowed values, relationships between shapes. Editing SHACL as raw `.ttl` is hostile to non-RDF experts. A visual editor lets stewards work at the schema level without writing Turtle by hand.

Building blocks:
- Canvas with shapes as nodes
- Shape properties (constraints, datatypes, cardinality, value restrictions) editable on the node
- Edges representing inter-shape relationships (`sh:node`, `sh:class`)
- Live preview of serialized `.ttl`
- Import an existing `.ttl` to populate the canvas
- Validate against sample RDF and annotate violations on relevant nodes
- Undo/redo
- Save back to the FDP server

*Design questions:*
- What's the primary interaction unit — the canvas, or a list/tree of shapes with the canvas as visualization? Canvas-first impresses on first sight but punishes power users editing 30+ shapes; tree-first is more familiar but underuses the spatial advantage.
- How does the editor present the difference between a property's *value constraints* (datatype, regex, range) and *cardinality constraints* (min/max count) without exposing the SHACL vocabulary directly?
- How does it handle the SHACL features outside the most common subset (`sh:sparql`, `sh:node`, `sh:qualifiedValueShape`)? Hide them? Surface them in an "advanced" panel? Reject them?
- How does keyboard navigation work on a canvas? Vue Flow has primitives but accessibility on node-graph editors is genuinely hard.
- What does the validation flow look like — does the steward upload sample RDF, or does the editor pull a few records of this type from the FDP and validate against those?
- How do schemas reference each other (a Dataset has a Catalog as parent — that's an inter-shape link) without overwhelming the canvas?
- What does "import existing `.ttl`" do if the imported file uses constructs the editor can't render? Refuse? Render the supported part and warn? Render and lock the unsupported part?

### Surface 3 — Visual ODRL editor

Less novel than the SHACL editor — a guided form rather than a canvas. The goal is to let stewards author access policies expressing things like "anyone with the researcher role can read, but only members of the BBMRI consortium can modify".

Building blocks:
- A wizard or layered form: pick action(s), add constraints, set conflict strategy
- The editor never permits constructs outside the FDP ODRL profile (see Section 8 of the architecture)
- Live preview of resulting RDF
- Template gallery for common policies ("public read, authenticated modify", "consortium-only", etc.)
- Display of the Offer version history (Offers are versioned and immutable)

*Design questions:*
- How does a steward author a policy combining Permissions and Prohibitions intuitively? The default is "deny wins" on conflict; the editor needs to surface that clearly without forcing every steward to learn the term "conflict strategy".
- How are roles and groups presented? The IdP defines them; the editor needs to either let the steward type a URI or pick from a list the IdP provides. Picking is friendlier but requires IdP integration. Typing is simpler but error-prone.
- How is the relationship between Offer and Agreement explained? Stewards author Offers but the system materializes Agreements. The distinction matters for audit but is jargon-heavy.
- How are time-window constraints expressed without making the simple case ("until end of 2027") clunky?
- How is policy inheritance visualized? A record without `dct:rights` inherits from its container; the steward should see what's in effect even when nothing is set on the record itself.
- Should there be a "test this policy" sandbox where a steward enters a hypothetical user and sees what the decision would be?

### Surface 4 — Metrics dashboard

The least novel surface but with strict privacy constraints.

Building blocks:
- Time-series charts: views, downloads, query counts, latency
- Top-N lists: most-viewed records, most-downloaded distributions
- Geographic distribution of visitors (country/region/city)
- Unique-visitor counts per day
- Per-resource drill-down for the steward responsible for that resource

*Design questions:*
- What's the default time window? Daily for the last 30 days? Hourly for the last 24 hours? A toggle?
- How does drill-down work — is it primarily "click into a record to see its metrics" or "go to dashboard, filter to one record"? The first is more discoverable; the second matches how analytics tools usually work.
- How are date ranges and aggregation granularity chosen without overwhelming the user with date pickers?
- How is the privacy posture surfaced? The user looking at this dashboard might not know that "unique visitors" is daily-rotated and not cross-day trackable. Some level of disclosure is good citizenship; too much is noise.
- The architecture explicitly excludes some data (query text, user identity). How does the UI gracefully handle "we don't track this" without seeming broken? A small info icon next to absent dimensions?

---

## Cross-cutting design questions

These cut across all four surfaces. They probably need to be answered once and then propagated.

- **Information architecture.** Is there a single top-level nav with the four surfaces equally weighted, or is one of them the "default" surface (browsing) and the others are accessed from within it?
- **Roles in the UI.** A steward and a consumer have very different default views of the same record (steward sees provenance, access info, audit; consumer sees content). Same page with conditional sections, or different routes? What about a single user who acts in both roles for different records?
- **Empty states.** A freshly bootstrapped FDP has just the default profile records. What does each surface look like when there's essentially nothing to show?
- **Permissions feedback.** When a steward attempts an action they're not authorized for, what does that look like? When a consumer queries data they can't see, what do they see?
- **Long operations.** Schema validation across many records, profile bootstrap progress, SPARQL queries that take seconds — what's the pattern? Inline progress, toast, page-level banner?
- **Errors and validation.** Server-side validation (SHACL, ODRL profile, LDP constraints) returns structured violation reports. How are these surfaced — inline at the offending field, a side panel, a summary at the top?
- **The "raw" escape hatch.** Power users will sometimes want to see and edit the actual RDF. Is there a single consistent affordance for that across surfaces, or is it specific per surface?

---

## Deliverables to ask for

Pick from this list based on where you are in the design process. Don't ask for everything at once.

**Early-phase deliverables** (start here)
- Information architecture proposal (nav, IA tree, primary user flows for each persona)
- User flows for the three or four most critical tasks (steward adds a record, consumer finds a dataset, steward edits access conditions, steward defines a new schema)
- An interaction-model proposal for the SHACL editor (canvas-primary vs. tree-primary vs. hybrid, with rationale)
- An interaction-model proposal for the ODRL editor (wizard vs. layered form vs. natural-language summary editing)

**Mid-phase deliverables**
- Wireframes for each of the four surfaces, focused on the primary task per surface
- An empty-states catalog
- A permissions-feedback pattern (consistent across surfaces)
- A design-token proposal: color, typography, spacing, with rationale anchored to accessibility
- An accessibility plan covering the SHACL editor specifically

**Late-phase deliverables**
- High-fidelity designs for the surfaces, in light and dark mode
- Component spec for any custom components beyond PrimeVue (the SHACL canvas node, the ODRL constraint chip, etc.)
- Microcopy for the privacy-sensitive surfaces (metrics dashboard captions, access-denied messaging, "this record exists but is restricted" messaging)

For any deliverable, push back on Claude if it produces something generic. "Make the search faster" is generic; "make the consumer's path from landing page to a usable accessURL fit in three clicks" is a design constraint.

---

## What good looks like

Some patterns worth noting because they're common failure modes:

- **Don't make the SHACL editor a graph drawing tool.** It's a schema editor that happens to use a canvas. The canvas serves the schema, not vice versa.
- **Don't make the ODRL editor a policy language teacher.** Stewards don't want to learn ODRL; they want to express access conditions. The vocabulary should be a server-side detail.
- **Don't make the metrics dashboard look like Google Analytics.** That style implies tracking the analytics tool doesn't actually do. Visual style should match the privacy posture.
- **Don't make consumers click through three modals to confirm they want to download.** Open data should feel open.
- **Don't make accessibility a v2 concern.** The SHACL editor in particular will be impossible to retrofit; design the keyboard model from the first sketch.

---

## A first ask for Claude

If you want a single prompt to start with after pasting this brief and attaching the architecture doc:

> Read the brief and the architecture document. Propose an information architecture for the four surfaces with a single top-level navigation. For each surface, identify the one or two primary tasks and sketch the user flow for each. Flag any design questions from the brief that your proposal doesn't resolve, so we can address them next.

That gets you a starting point you can iterate from across the next several sessions.
