# ADR-0001: Consume the CatalogRecord meta-metadata projection

**Status:** Proposed
**Date:** 2026-07-06
**Driven by:** server [ADR-0022](../../../server/docs/adr/0022-catalogrecord-meta-metadata.md)
(dcat:CatalogRecord as the public face of the meta-metadata graph); FDP specification suite
v2.0 CORE-12/CORE-13.

## Context

Server ADR-0022 changes the shape and exposure of every record's `<record>/meta` graph:

- the subject becomes the meta resource IRI itself, typed `dcat:CatalogRecord` (+ `prov:Entity`),
  with `foaf:primaryTopic` pointing at the record;
- the record's creation date moves from `dct:created` to `dct:issued` (with a deprecation
  window in which both are emitted);
- a **public projection** of the meta graph (type, `foaf:primaryTopic`, `dct:issued`,
  `dct:modified`, `dct:conformsTo`/`fdp:validatedAgainst`) becomes readable without
  authentication for publicly readable records — today the client assumes `/meta` is readable
  only for authorised callers;
- record representations gain an injected `foaf:isPrimaryTopicOf` link and catalogs gain
  `dcat:record` links.

Current client touchpoints: `api/state.ts` reads `fdp:metadataState` from `/meta`
(subject-agnostic parse via `anyObject`, so the subject shift does not break it);
`api/rdf.ts` maps a record's "last updated" from the *record graph's* `dct:modified`, which
conflates the resource's own update date with the metadata record's update date — exactly the
ambiguity the CatalogRecord separates; `composables/useCatalogs.ts` queries `dct:modified` over
SPARQL (where meta graphs remain excluded); `api/entityForms.ts` treats `dct:modified` as a
server-managed field in forms.

## Decision

1. **One meta accessor.** Introduce a single `fetchMetaRecord(recordPath)` API module that GETs
   `<record>/meta`, parses the CatalogRecord, and returns `{ issued, modified, conformsTo,
   state?, version?, creator? }` — the optional fields present only when the caller is
   authorised (the public projection omits them). `api/state.ts`'s state reading folds into it;
   the subject-agnostic parse is replaced by reading from the `dcat:CatalogRecord`-typed subject
   (with `foaf:primaryTopic` as the cross-check), and `dct:created` is accepted as a fallback
   for `dct:issued` during the server's deprecation window.

2. **Two dates, two labels.** Record detail views distinguish "resource updated"
   (`dct:modified` in the record graph, when the described object carries it) from
   "record updated" (`dct:modified` on the CatalogRecord). Listings and the dashboard use the
   CatalogRecord date, since that is what freshness of the *metadata* means; `useCatalogs.ts`
   keeps its SPARQL source for now and is annotated accordingly.

3. **Forms stay hands-off.** CatalogRecord fields are never editable in entity forms: they are
   server-maintained (spec REC-09). `entityForms.ts`'s server-managed list extends to
   `dct:issued` on the meta resource; no form ever posts meta-metadata.

4. **No new navigation surface.** The client continues to reach meta resources by the
   deterministic `/meta` suffix; the injected `foaf:isPrimaryTopicOf`/`dcat:record` links are
   treated as confirmation, not discovery — the client renders them but does not depend on them
   (static/foreign FDPs the client may browse in future could place meta resources elsewhere,
   and then the links become the discovery mechanism).

## Alternatives considered

**Keep reading dates from the record graph only.** Rejected: it perpetuates the
resource-date/record-date conflation the server just fixed, and shows harvest-style staleness
bugs (a record edit that doesn't touch the object's own `dct:modified` would appear unchanged).

**Parse `/meta` leniently forever (subject-agnostic).** Rejected as the long-term posture:
subject-agnostic parsing silently accepts malformed meta graphs and cannot distinguish the
record's dates from any other dates in the graph once meta graphs carry more than one subject
(the PROV Activity already is one). Reading from the typed subject is barely more code and
validates what it reads.

**Hide meta-metadata from anonymous users in the UI regardless of the public projection.**
Rejected: issued/modified dates are precisely what anonymous consumers (and harvesters) need to
judge freshness; hiding public data in the UI serves no one.

## Consequences

**Easier:**

- The UI can finally show truthful "record last updated" information for anonymous visitors,
  matching what FAIR Discovery reports about the same records.
- One accessor replaces scattered `/meta` and record-graph date logic; the state badge and the
  dates come from the same fetch.

**Harder:**

- Requires coordinated release with server ADR-0022 (the accessor must handle both the old and
  new meta shape during rollout; the `dct:created` fallback covers this).
- Two date labels need i18n strings and a place in the record-detail layout — a small UX
  decision to settle in design review.
- Tests asserting the old `/meta` parse (`state.spec.ts`) and the record-graph date mapping
  (`rdf.ts` fixtures) need updating.
