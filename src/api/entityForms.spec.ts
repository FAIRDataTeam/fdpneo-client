import { describe, expect, it } from "vitest";
import {
  buildCreateTurtle,
  modelFromTurtle,
  applyEditTurtle,
  specFor,
  typeForId,
  emptyModel,
  parseKeywords,
  fieldsFromShape,
} from "./entityForms";
import { NS, parseTurtle, one, many } from "./rdf";

const DATASET = "http://localhost:8000/dataset/ad";
const CATALOG = "http://localhost:8000/catalog/cohort";

describe("typeForId / specFor", () => {
  it("derives the type from a path id", () => {
    expect(typeForId("dataset/ad")).toBe("dataset");
    expect(typeForId("catalog/cohort")).toBe("catalog");
    expect(typeForId("distribution/x")).toBe("distribution");
    expect(typeForId("nope/x")).toBeNull();
  });

  it("dataset spec carries keyword + theme fields", () => {
    const keys = specFor("dataset").fields.map((f) => f.key);
    expect(keys).toContain("keywords");
    expect(keys).toContain("theme");
  });
});

describe("parseKeywords", () => {
  it("splits, trims, and drops empties", () => {
    expect(parseKeywords(" a, b ,, c ")).toEqual(["a", "b", "c"]);
    expect(parseKeywords("")).toEqual([]);
  });
});

describe("buildCreateTurtle", () => {
  it("emits rdf:type, fields, and the parent isPartOf link", async () => {
    const spec = specFor("dataset");
    const model = {
      ...emptyModel(spec),
      title: "AD Cohort",
      description: "Longitudinal MRI",
      keywords: ["alzheimer", "mri"],
      license: "https://creativecommons.org/licenses/by/4.0/",
    };
    const ttl = await buildCreateTurtle(DATASET, spec, model, CATALOG);
    const store = parseTurtle(ttl);

    expect(many(store, DATASET, `${NS.rdf}type`)).toContain(`${NS.dcat}Dataset`);
    expect(one(store, DATASET, `${NS.dct}title`)).toBe("AD Cohort");
    expect(many(store, DATASET, `${NS.dcat}keyword`).sort()).toEqual(["alzheimer", "mri"]);
    expect(one(store, DATASET, `${NS.dct}license`)).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(one(store, DATASET, `${NS.dct}isPartOf`)).toBe(CATALOG);
  });

  it("omits empty fields", async () => {
    const spec = specFor("catalog");
    const ttl = await buildCreateTurtle(CATALOG, spec, { ...emptyModel(spec), title: "Cohort" }, null);
    const store = parseTurtle(ttl);
    expect(one(store, CATALOG, `${NS.dct}description`)).toBeUndefined();
    expect(one(store, CATALOG, `${NS.dct}isPartOf`)).toBeUndefined();
  });
});

describe("modelFromTurtle / applyEditTurtle (read-modify-write)", () => {
  const SEED = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
<${DATASET}> a dcat:Dataset ;
  dcterms:title "Old title" ;
  dcterms:isPartOf <${CATALOG}> ;
  dcat:keyword "old" .
`;

  it("round-trips the model out of a graph", () => {
    const model = modelFromTurtle(SEED, DATASET, specFor("dataset"));
    expect(model.title).toBe("Old title");
    expect(model.keywords).toEqual(["old"]);
    expect(model.description).toBe("");
  });

  it("edits managed fields while preserving rdf:type and isPartOf", async () => {
    const spec = specFor("dataset");
    const model = { ...modelFromTurtle(SEED, DATASET, spec), title: "New title", keywords: ["a", "b"] };
    const ttl = await applyEditTurtle(SEED, DATASET, spec, model);
    const store = parseTurtle(ttl);

    expect(one(store, DATASET, `${NS.dct}title`)).toBe("New title");
    expect(many(store, DATASET, `${NS.dcat}keyword`).sort()).toEqual(["a", "b"]);
    // untouched triples survive
    expect(many(store, DATASET, `${NS.rdf}type`)).toContain(`${NS.dcat}Dataset`);
    expect(one(store, DATASET, `${NS.dct}isPartOf`)).toBe(CATALOG);
  });
});

describe("fieldsFromShape (SHACL → form fields, 7.5)", () => {
  const SHAPE = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
dcat:Dataset a sh:NodeShape ;
  sh:targetClass dcat:Dataset ;
  sh:property [ sh:path dcterms:title ; sh:datatype xsd:string ; sh:minCount 1 ; sh:name "title" ] ,
    [ sh:path dcterms:description ; sh:datatype xsd:string ] ,
    [ sh:path dcat:keyword ; sh:datatype xsd:string ] ,
    [ sh:path dcterms:license ; sh:nodeKind sh:IRI ; sh:maxCount 1 ] ,
    [ sh:path dcat:theme ; sh:nodeKind sh:IRI ] ,
    [ sh:path dcterms:isPartOf ; sh:nodeKind sh:IRI ; sh:maxCount 1 ] ,
    [ sh:path dcterms:modified ; sh:datatype xsd:dateTime ; sh:maxCount 1 ] ,
    [ sh:path dcat:contactPoint ] .
`;
  const fields = fieldsFromShape(SHAPE, `${NS.dcat}Dataset`);
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));

  it("orders title then description then the rest, and excludes structural/managed/blank-node fields", () => {
    expect(fields.map((f) => f.key)).toEqual(["title", "description", "keyword", "license", "theme"]);
  });

  it("maps datatype/nodeKind/cardinality to the right kinds", () => {
    expect(byKey.title?.kind).toBe("text");
    expect(byKey.title?.required).toBe(true);
    expect(byKey.description?.kind).toBe("textarea");
    expect(byKey.keyword?.kind).toBe("keywords"); // repeatable literal
    expect(byKey.license?.kind).toBe("iri"); // single IRI
    expect(byKey.theme?.kind).toBe("iris"); // repeatable IRI
  });

  it("returns [] when the shape isn't present (caller falls back to the static spec)", () => {
    expect(fieldsFromShape("@prefix x: <http://x/> . x:a x:b x:c .", `${NS.dcat}Dataset`)).toEqual([]);
  });
});
