/**
 * graphModel: the record/attribute split that drives the live RDF graph.
 * Records = object IRIs under the FDP base (relations); literals + external IRIs
 * (licence, theme, publisher, rdf:type) = attributes.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { curie, isRecordIri, neighbourhood } from "./graphModel";
import { NS } from "@/api/rdf";

const BASE = "http://localhost:8000";
beforeEach(() => {
  vi.stubEnv("VITE_FDP_API_URL", BASE);
});

const FOCUS = `${BASE}/dataset/brain`;
const TURTLE = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
<${BASE}/dataset/brain> a dcat:Dataset ;
  dct:title "Brain MRI" ;
  dct:identifier "10.5281/zenodo.1" ;
  dct:isPartOf <${BASE}/catalog/imaging> ;
  dct:publisher <https://ror.org/018906e22> ;
  dct:license <https://creativecommons.org/licenses/by/4.0/> ;
  dcat:distribution <${BASE}/distribution/tabular> .
<${BASE}/catalog/imaging> dcat:dataset <${BASE}/dataset/brain> .
`;

describe("curie", () => {
  it("compacts known namespaces and rdf:type", () => {
    expect(curie(`${NS.rdf}type`)).toBe("rdf:type");
    expect(curie(`${NS.dct}title`)).toBe("dct:title");
    expect(curie(`${NS.dcat}distribution`)).toBe("dcat:distribution");
  });
  it("falls back to the local name for unknown vocabularies", () => {
    expect(curie("http://example.org/custom#weight")).toBe("weight");
  });
});

describe("isRecordIri", () => {
  it("treats IRIs under the FDP base as records and others as not", () => {
    expect(isRecordIri(`${BASE}/dataset/x`)).toBe(true);
    expect(isRecordIri(BASE)).toBe(true); // the repository root
    expect(isRecordIri("https://creativecommons.org/licenses/by/4.0/")).toBe(false);
    expect(isRecordIri("http://www.w3.org/ns/dcat#Dataset")).toBe(false);
  });
});

describe("neighbourhood", () => {
  it("splits records (relations) from attributes", () => {
    const g = neighbourhood(TURTLE, FOCUS);
    const recIris = g.recordNodes.map((n) => n.iri).sort();
    expect(recIris).toEqual(
      [`${BASE}/catalog/imaging`, `${BASE}/dataset/brain`, `${BASE}/distribution/tabular`].sort(),
    );
    // focus carries its real kind/title
    const focus = g.recordNodes.find((n) => n.focus);
    expect(focus).toMatchObject({ type: "dataset", label: "Brain MRI", recordId: "dataset/brain" });
    // neighbour kind comes from the path prefix
    expect(g.recordNodes.find((n) => n.iri.endsWith("/catalog/imaging"))?.type).toBe("catalog");
  });

  it("classifies literals and external IRIs as attributes", () => {
    const g = neighbourhood(TURTLE, FOCUS);
    const byPred = (p: string) => g.attrs.find((a) => a.pred === p);
    expect(byPred(`${NS.dct}title`)).toMatchObject({ value: "Brain MRI", isIri: false });
    expect(byPred(`${NS.dct}identifier`)?.isIri).toBe(false);
    // external IRIs are attributes, not relation nodes
    expect(byPred(`${NS.dct}publisher`)).toMatchObject({ isIri: true });
    expect(byPred(`${NS.dct}license`)?.isIri).toBe(true);
    expect(byPred(`${NS.rdf}type`)).toMatchObject({ isIri: true, value: "dcat:Dataset" });
    // no record IRI leaked into attributes
    expect(g.attrs.some((a) => a.href?.includes(`${BASE}/`))).toBe(false);
  });

  it("records relation edges including incoming ones", () => {
    const g = neighbourhood(TURTLE, FOCUS);
    const rel = g.edges.filter((e) => e.kind === "rel");
    expect(rel.some((e) => e.o.endsWith("/catalog/imaging") && !e.incoming)).toBe(true); // isPartOf
    expect(rel.some((e) => e.o.endsWith("/distribution/tabular"))).toBe(true);
    expect(rel.some((e) => e.incoming && e.s.endsWith("/catalog/imaging"))).toBe(true); // dcat:dataset →
    // attribute edges point at attribute leaves
    expect(g.edges.filter((e) => e.kind === "attr").length).toBe(g.attrs.length);
  });

  it("returns an empty neighbourhood for unparseable turtle", () => {
    expect(neighbourhood("@@ not turtle", FOCUS)).toEqual({ recordNodes: [], attrs: [], edges: [] });
  });
});
