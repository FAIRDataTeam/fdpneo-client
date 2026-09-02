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
  orGroupsFromShape,
  missingOrGroups,
  validateConstraints,
  type EntitySpec,
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

describe("dual-identifier fields (ADR-0014)", () => {
  it("writes dct:identifier (literal) + owl:sameAs / skos:exactMatch (IRIs)", async () => {
    const spec = specFor("dataset");
    const model = {
      ...emptyModel(spec),
      title: "X",
      identifier: "https://doi.org/10.5072/x",
      sameAs: ["https://w3id.org/example/x"],
      exactMatch: ["https://registry.example.org/x", "https://other.example/x"],
    };
    const ttl = await buildCreateTurtle(DATASET, spec, model, null);
    const store = parseTurtle(ttl);

    expect(one(store, DATASET, `${NS.dct}identifier`)).toBe("https://doi.org/10.5072/x");
    expect(many(store, DATASET, `${NS.owl}sameAs`)).toEqual(["https://w3id.org/example/x"]);
    expect(many(store, DATASET, `${NS.skos}exactMatch`).sort()).toEqual([
      "https://other.example/x",
      "https://registry.example.org/x",
    ]);
  });

  it("reads identifier set back out of a graph for editing", () => {
    const seed = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
<${DATASET}> a dcat:Dataset ;
  dcterms:title "T" ;
  dcterms:identifier "DOI:1" ;
  owl:sameAs <https://w3id.org/example/x> ;
  skos:exactMatch <https://registry.example.org/x> .
`;
    const model = modelFromTurtle(seed, DATASET, specFor("dataset"));
    expect(model.identifier).toBe("DOI:1");
    expect(model.sameAs).toEqual(["https://w3id.org/example/x"]);
    expect(model.exactMatch).toEqual(["https://registry.example.org/x"]);
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

  it("drops blank rows from a multi-value field on save", async () => {
    const spec = specFor("dataset");
    // The repeatable editor can leave empty rows; serialization must prune them.
    const model = { ...modelFromTurtle(SEED, DATASET, spec), keywords: ["a", "", "  ", "b"] };
    const ttl = await applyEditTurtle(SEED, DATASET, spec, model);
    expect(many(parseTurtle(ttl), DATASET, `${NS.dcat}keyword`).sort()).toEqual(["a", "b"]);
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

  it("orders title then description then the rest, and appends the access-policy picker", () => {
    expect(fields.map((f) => f.key)).toEqual(["title", "description", "keyword", "license", "theme", "rights"]);
  });

  it("maps datatype/nodeKind/cardinality to the right kinds; license/rights are managed-doc pickers", () => {
    expect(byKey.title?.kind).toBe("text");
    expect(byKey.title?.required).toBe(true);
    expect(byKey.description?.kind).toBe("textarea");
    expect(byKey.keyword?.kind).toBe("keywords"); // repeatable literal
    expect(byKey.license?.kind).toBe("ref"); // managed-license picker (5.5)
    expect(byKey.license?.source).toBe("licenses");
    expect(byKey.theme?.kind).toBe("iris"); // repeatable IRI
    expect(byKey.rights?.kind).toBe("ref"); // appended access-policy picker
    expect(byKey.rights?.source).toBe("policies");
  });

  it("carries raw cardinality (sh:minCount/sh:maxCount) for the repeatable editor", () => {
    expect(byKey.title?.minCount).toBe(1); // sh:minCount 1
    expect(byKey.license?.maxCount).toBe(1); // sh:maxCount 1
    expect(byKey.keyword?.minCount).toBeUndefined(); // unbounded repeatable
    expect(byKey.keyword?.maxCount).toBeUndefined();
  });

  it("returns [] when the shape isn't present (caller falls back to the static spec)", () => {
    expect(fieldsFromShape("@prefix x: <http://x/> . x:a x:b x:c .", `${NS.dcat}Dataset`)).toEqual([]);
  });
});

describe("ref fields (dct:rights / dct:license) write + read as IRIs (5.5)", () => {
  it("buildCreateTurtle emits ref values as IRIs and modelFromTurtle reads them back", async () => {
    const spec = specFor("dataset");
    const iri = "http://x/dataset/d1";
    const model = {
      ...emptyModel(spec),
      title: "D",
      rights: "http://x/policies/p1",
      license: "http://x/licenses/cc0",
    };
    const ttl = await buildCreateTurtle(iri, spec, model, null);
    const store = parseTurtle(ttl);
    expect(one(store, iri, `${NS.dct}rights`)).toBe("http://x/policies/p1");
    expect(one(store, iri, `${NS.dct}license`)).toBe("http://x/licenses/cc0");

    const back = modelFromTurtle(ttl, iri, spec);
    expect(back.rights).toBe("http://x/policies/p1");
    expect(back.license).toBe("http://x/licenses/cc0");
  });
});

describe("orGroupsFromShape (sh:or → at-least-one groups)", () => {
  const head = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .`;

  it("reads the canonical property-shape branch form", () => {
    const ttl = `${head}
dcat:Distribution a sh:NodeShape ; sh:targetClass dcat:Distribution ;
  sh:or ( [ sh:path dcat:downloadURL ; sh:minCount 1 ] [ sh:path dcat:accessURL ; sh:minCount 1 ] ) ;
  sh:property [ sh:path dcterms:title ] .`;
    const groups = orGroupsFromShape(ttl, `${NS.dcat}Distribution`);
    expect(groups).toEqual([{ keys: ["downloadURL", "accessURL"] }]);
  });

  it("also reads the node-shape branch form", () => {
    const ttl = `${head}
dcat:Distribution a sh:NodeShape ; sh:targetClass dcat:Distribution ;
  sh:or ( [ sh:property [ sh:path dcat:downloadURL ; sh:minCount 1 ] ]
          [ sh:property [ sh:path dcat:accessURL ; sh:minCount 1 ] ] ) .`;
    const groups = orGroupsFromShape(ttl, `${NS.dcat}Distribution`);
    expect(groups).toEqual([{ keys: ["downloadURL", "accessURL"] }]);
  });
});

describe("fieldsFromShape — enum (sh:in) + typed inputs (sh:datatype)", () => {
  const XSD = "http://www.w3.org/2001/XMLSchema#";
  const TYPED = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://ex.org/> .

ex:Thing a sh:NodeShape ; sh:targetClass ex:Thing ;
  sh:property [ sh:path ex:status ; sh:in ( "draft" "final" ) ; sh:maxCount 1 ] ;
  sh:property [ sh:path ex:issued ; sh:datatype xsd:date ; sh:maxCount 1 ] ;
  sh:property [ sh:path ex:moment ; sh:datatype xsd:dateTime ; sh:maxCount 1 ] ;
  sh:property [ sh:path ex:size ; sh:datatype xsd:integer ; sh:maxCount 1 ] ;
  sh:property [ sh:path ex:active ; sh:datatype xsd:boolean ; sh:maxCount 1 ] .`;

  it("maps sh:in → enum with options, and datatypes → typed kinds", () => {
    const fields = fieldsFromShape(TYPED, "http://ex.org/Thing");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.status?.kind).toBe("enum");
    expect(byKey.status?.options).toEqual(["draft", "final"]);
    expect(byKey.issued?.kind).toBe("date");
    expect(byKey.issued?.datatype).toBe(`${XSD}date`);
    expect(byKey.moment?.kind).toBe("datetime");
    expect(byKey.size?.kind).toBe("number");
    expect(byKey.active?.kind).toBe("boolean");
  });

  it("honors an explicit dash:editor for single-literal widgets", () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://ex.org/> .

ex:Thing a sh:NodeShape ; sh:targetClass ex:Thing ;
  sh:property [ sh:path ex:note ; sh:datatype xsd:string ; sh:maxCount 1 ; dash:editor dash:TextAreaEditor ] ;
  sh:property [ sh:path ex:flag ; sh:datatype xsd:boolean ; sh:maxCount 1 ; dash:editor dash:BooleanSelectEditor ] .`;
    const byKey = Object.fromEntries(
      fieldsFromShape(ttl, "http://ex.org/Thing").map((f) => [f.key, f]),
    );
    expect(byKey.note?.kind).toBe("textarea"); // would otherwise be plain text
    expect(byKey.flag?.kind).toBe("boolean");
  });

  it("captures a reference widget + sh:class for dash:AutoCompleteEditor", () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://ex.org/> .

ex:Thing a sh:NodeShape ; sh:targetClass ex:Thing ;
  sh:property [ sh:path ex:agent ; sh:nodeKind sh:IRI ; sh:class foaf:Agent ; sh:maxCount 1 ; dash:editor dash:AutoCompleteEditor ] .`;
    const f = fieldsFromShape(ttl, "http://ex.org/Thing").find((x) => x.key === "agent");
    expect(f?.kind).toBe("iri");
    expect(f?.refWidget).toBe("autocomplete");
    expect(f?.refClass).toBe("http://xmlns.com/foaf/0.1/Agent");
  });

  it("serializes a typed literal with its datatype", async () => {
    const spec = {
      type: "distribution",
      classIri: "http://ex.org/Thing",
      label: "Thing",
      prefix: "distribution",
      childTypes: [],
      fields: [{ key: "issued", predicate: "http://ex.org/issued", label: "Issued", kind: "date", datatype: `${XSD}date` }],
    } as unknown as EntitySpec;
    const ttl = await buildCreateTurtle("http://x/t1", spec, { issued: "2024-01-01" }, null);
    expect(ttl).toContain("2024-01-01");
    expect(ttl.includes("xsd:date") || ttl.includes("XMLSchema#date")).toBe(true);
  });
});

describe("DetailsEditor (nested sh:node sub-form)", () => {
  const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix vcard: <http://www.w3.org/2006/vcard/ns#> .
@prefix ex: <http://ex.org/> .

ex:Thing a sh:NodeShape ; sh:targetClass ex:Thing ;
  sh:property [ sh:path ex:contact ; sh:node ex:ContactShape ; sh:class vcard:Kind ; sh:maxCount 1 ] .
ex:ContactShape a sh:NodeShape ;
  sh:property [ sh:path vcard:fn ; sh:datatype xsd:string ; sh:maxCount 1 ] ;
  sh:property [ sh:path vcard:hasEmail ; sh:nodeKind sh:IRI ; sh:maxCount 1 ] .`;

  function thingSpec(): EntitySpec {
    return {
      type: "distribution",
      classIri: "http://ex.org/Thing",
      label: "Thing",
      prefix: "distribution",
      childTypes: [],
      fields: fieldsFromShape(ttl, "http://ex.org/Thing"),
    };
  }

  it("resolves a details field with nested scalar fields", () => {
    const f = thingSpec().fields.find((x) => x.key === "contact");
    expect(f?.kind).toBe("details");
    expect(f?.nested?.map((n) => n.key)).toEqual(["fn", "hasEmail"]);
    expect(f?.nestedClass).toBe("http://www.w3.org/2006/vcard/ns#Kind");
  });

  it("round-trips the nested object via a blank node", async () => {
    const spec = thingSpec();
    const out = await buildCreateTurtle(
      "http://x/t",
      spec,
      { "contact.fn": "Jane Doe", "contact.hasEmail": "mailto:jane@x.org" },
      null,
    );
    expect(out).toContain("Jane Doe");
    expect(out).toContain("mailto:jane@x.org");
    const back = modelFromTurtle(out, "http://x/t", spec);
    expect(back["contact.fn"]).toBe("Jane Doe");
    expect(back["contact.hasEmail"]).toBe("mailto:jane@x.org");
  });
});

describe("rdf:langString (lang-tagged literals)", () => {
  const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex: <http://ex.org/> .

ex:Thing a sh:NodeShape ; sh:targetClass ex:Thing ;
  sh:property [ sh:path ex:label ; sh:datatype rdf:langString ; sh:maxCount 1 ] .`;

  it("detects a langString field", () => {
    const f = fieldsFromShape(ttl, "http://ex.org/Thing").find((x) => x.key === "label");
    expect(f?.lang).toBe(true);
  });

  it("round-trips value + language tag", async () => {
    const spec = {
      type: "distribution",
      classIri: "http://ex.org/Thing",
      label: "Thing",
      prefix: "distribution",
      childTypes: [],
      fields: [{ key: "label", predicate: "http://ex.org/label", label: "Label", kind: "text", lang: true }],
    } as unknown as EntitySpec;
    const out = await buildCreateTurtle("http://x/t", spec, { label: "Bonjour", label__lang: "fr" }, null);
    expect(out).toMatch(/"Bonjour"@fr/);
    const back = modelFromTurtle(out, "http://x/t", spec);
    expect(back.label).toBe("Bonjour");
    expect(back.label__lang).toBe("fr");
  });
});

describe("validateConstraints (client pre-validation of pattern/length/range)", () => {
  const spec = {
    fields: [
      { key: "code", predicate: "x", label: "Code", kind: "text", pattern: "^[A-Z]{3}$", minLength: 3, maxLength: 3 },
      { key: "size", predicate: "y", label: "Size", kind: "number", minInclusive: 0, maxInclusive: 100 },
    ],
  } as unknown as EntitySpec;

  it("flags length/pattern and numeric-range violations", () => {
    expect(validateConstraints(spec, { code: "ABCD" })?.key).toBe("code");
    expect(validateConstraints(spec, { code: "abc" })?.message).toContain("pattern");
    expect(validateConstraints(spec, { size: "200" })?.message).toContain("≤ 100");
  });

  it("passes valid values and ignores empty (required's job)", () => {
    expect(validateConstraints(spec, { code: "ABC", size: "50" })).toBeNull();
    expect(validateConstraints(spec, { code: "", size: "" })).toBeNull();
  });
});

describe("missingOrGroups (at-least-one validation)", () => {
  const spec = { orGroups: [{ keys: ["downloadURL", "accessURL"] }] } as unknown as EntitySpec;

  it("flags a group when none of its members has a value", () => {
    expect(missingOrGroups(spec, {})).toHaveLength(1);
    expect(missingOrGroups(spec, { downloadURL: "" })).toHaveLength(1);
  });

  it("passes when at least one member has a value", () => {
    expect(missingOrGroups(spec, { downloadURL: "http://x/f.csv" })).toEqual([]);
    expect(missingOrGroups(spec, { accessURL: "http://x/api" })).toEqual([]);
  });
});

describe("fieldsFromShape — shape closure (sh:node / sh:and inheritance)", () => {
  // fs:catalog → sh:node fs:dataset → sh:node fs:resource. Each contributes a
  // distinct property; the form should union all three (the closure /spec serves).
  const CHAIN = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix fs: <http://x/shapes/> .
fs:catalog a sh:NodeShape ; sh:targetClass dcat:Catalog ; rdfs:label "DCAT Catalog" ;
  sh:node fs:dataset ;
  sh:property [ sh:path dcat:themeTaxonomy ; sh:nodeKind sh:IRI ] .
fs:dataset a sh:NodeShape ; sh:targetClass dcat:Dataset ; rdfs:label "DCAT Dataset" ;
  sh:node fs:resource ;
  sh:property [ sh:path dcat:theme ; sh:nodeKind sh:IRI ] .
fs:resource a sh:NodeShape ; rdfs:label "DCAT Resource" ;
  sh:property [ sh:path dcterms:title ; sh:datatype xsd:string ; sh:minCount 1 ] .`;

  it("unions property shapes across the whole closure", () => {
    const paths = fieldsFromShape(CHAIN, `${NS.dcat}Catalog`).map((f) => f.predicate);
    expect(paths).toContain(`${NS.dcat}themeTaxonomy`); // catalog
    expect(paths).toContain(`${NS.dcat}theme`); // dataset (inherited)
    expect(paths).toContain(`${NS.dct}title`); // resource (inherited)
  });

  it("tags inherited fields with their originating shape label", () => {
    const fields = fieldsFromShape(CHAIN, `${NS.dcat}Catalog`);
    expect(fields.find((f) => f.predicate === `${NS.dct}title`)?.origin).toBe("DCAT Resource");
    expect(fields.find((f) => f.predicate === `${NS.dcat}theme`)?.origin).toBe("DCAT Dataset");
  });

  it("dedupes by sh:path, most-derived (target-first) shape winning", () => {
    // Both catalog and resource constrain dcterms:title; catalog makes it optional
    // (no minCount), resource requires it. The target (catalog) must win.
    const OVERRIDE = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix fs: <http://x/shapes/> .
fs:catalog a sh:NodeShape ; sh:targetClass dcat:Catalog ; sh:node fs:resource ;
  sh:property [ sh:path dcterms:title ; sh:datatype xsd:string ] .
fs:resource a sh:NodeShape ;
  sh:property [ sh:path dcterms:title ; sh:datatype xsd:string ; sh:minCount 1 ] .`;
    const titles = fieldsFromShape(OVERRIDE, `${NS.dcat}Catalog`).filter(
      (f) => f.predicate === `${NS.dct}title`,
    );
    expect(titles).toHaveLength(1);
    expect(titles[0]?.required).toBeUndefined(); // catalog's (optional) constraint won
  });

  it("terminates on a sh:node cycle", () => {
    const CYCLE = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix fs: <http://x/shapes/> .
fs:a a sh:NodeShape ; sh:targetClass dcat:Catalog ; sh:node fs:b ;
  sh:property [ sh:path dcterms:title ; sh:datatype xsd:string ] .
fs:b a sh:NodeShape ; sh:node fs:a ;
  sh:property [ sh:path dcterms:description ; sh:datatype xsd:string ] .`;
    const paths = fieldsFromShape(CYCLE, `${NS.dcat}Catalog`).map((f) => f.predicate);
    expect(paths).toContain(`${NS.dct}title`);
    expect(paths).toContain(`${NS.dct}description`);
  });

  it("honours inherited sh:or groups via the closure", () => {
    const OR = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix fs: <http://x/shapes/> .
fs:distribution a sh:NodeShape ; sh:targetClass dcat:Distribution ; sh:node fs:base ;
  sh:property [ sh:path dcat:byteSize ] .
fs:base a sh:NodeShape ;
  sh:or ( [ sh:path dcat:downloadURL ] [ sh:path dcat:accessURL ] ) .`;
    const groups = orGroupsFromShape(OR, `${NS.dcat}Distribution`);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.keys.sort()).toEqual(["accessURL", "downloadURL"]);
  });
});

describe("fieldsFromShape sh:or datatype union (0.15 lang relaxation)", () => {
  const SHAPE = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
dcat:Dataset a sh:NodeShape ;
  sh:targetClass dcat:Dataset ;
  sh:property [ sh:path dcterms:title ; sh:minCount 1 ; sh:name "title" ;
    sh:or ( [ sh:datatype xsd:string ] [ sh:datatype rdf:langString ] ) ] ;
  sh:property [ sh:path dcterms:abstract ;
    sh:or ( [ sh:datatype xsd:string ] [ sh:nodeKind sh:IRI ] ) ] .
`;

  it("flattens a string|langString union into a lang-capable text field", () => {
    const fields = fieldsFromShape(SHAPE, "http://www.w3.org/ns/dcat#Dataset");
    const title = fields.find((f) => f.predicate === "http://purl.org/dc/terms/title");
    expect(title).toBeDefined();
    expect(title?.kind).toBe("text");
    expect(title?.lang).toBe(true);
    expect(title?.required).toBe(true);
  });

  it("does not flatten a mixed (non-datatype) union", () => {
    const fields = fieldsFromShape(SHAPE, "http://www.w3.org/ns/dcat#Dataset");
    expect(fields.find((f) => f.predicate === "http://purl.org/dc/terms/abstract")).toBeUndefined();
  });
});
