import { describe, expect, it } from "vitest";
import { Parser } from "n3";
import { PREFIXES } from "@/rdf/namespaces";
import { serializeSchema } from "./serialize";
import { parseSchema } from "./parse";
import type { Field, SchemaDocument } from "./model";

function field(over: Partial<Field>): Field {
  return {
    id: "f",
    widgetId: "TextFieldEditor",
    editor: "dash:TextFieldEditor",
    name: "",
    description: "",
    path: ":unknownPath",
    nodeKind: null,
    datatype: null,
    class: null,
    node: null,
    minCount: null,
    maxCount: null,
    minLength: null,
    maxLength: null,
    pattern: "",
    defaultValue: "",
    inValues: null,
    order: 0,
    ...over,
  };
}

/** Multi-shape seed: a Dataset shape (two groups) + a Distribution shape. */
function seed(): SchemaDocument {
  return {
    prefixes: PREFIXES,
    shapes: [
      {
        id: "s1",
        shapeIri: ":DatasetShape",
        label: "Dataset",
        comment: "A DCAT-style dataset metadata schema",
        targetClass: "dcat:Dataset",
        groups: [
          {
            id: "g1",
            label: "General information",
            order: 0,
            fields: [
              field({
                id: "f1",
                name: "Title",
                description: "A human-readable title",
                path: "dct:title",
                nodeKind: "sh:Literal",
                datatype: "xsd:string",
                minCount: 1,
                maxCount: 1,
                minLength: 1,
                maxLength: 200,
                pattern: "^.+$",
                order: 0,
              }),
              field({
                id: "f2",
                widgetId: "EnumSelectEditor",
                editor: "dash:EnumSelectEditor",
                name: "Access rights",
                path: "dct:accessRights",
                nodeKind: "sh:Literal",
                datatype: "xsd:string",
                inValues: ["public", "restricted"],
                minCount: 1,
                maxCount: 1,
                order: 1,
              }),
            ],
          },
          {
            id: "g2",
            label: "Provenance",
            order: 1,
            fields: [
              field({
                id: "f3",
                widgetId: "AutoCompleteEditor",
                editor: "dash:AutoCompleteEditor",
                name: "Publisher",
                path: "dct:publisher",
                nodeKind: "sh:IRI",
                class: "foaf:Agent",
                minCount: 1,
                maxCount: 1,
                order: 0,
              }),
            ],
          },
        ],
      },
      {
        id: "s2",
        shapeIri: ":DistributionShape",
        label: "Distribution",
        comment: "",
        targetClass: "dcat:Distribution",
        groups: [
          {
            id: "g3",
            label: "General information",
            order: 0,
            fields: [
              field({
                id: "f4",
                name: "Count",
                path: "dcat:byteSize",
                nodeKind: "sh:Literal",
                datatype: "xsd:integer",
                widgetId: "NumberFieldEditor",
                editor: "dash:TextFieldEditor",
                order: 0,
              }),
            ],
          },
        ],
      },
    ],
  };
}

/** Drop client-only ids so two structurally-equal documents compare equal. */
function stripIds(doc: SchemaDocument): unknown {
  return {
    prefixes: doc.prefixes,
    shapes: doc.shapes.map((s) => ({
      shapeIri: s.shapeIri,
      label: s.label,
      comment: s.comment,
      targetClass: s.targetClass,
      groups: s.groups.map((g) => ({
        label: g.label,
        order: g.order,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fields: g.fields.map(({ id, ...rest }) => rest),
      })),
    })),
  };
}

describe("parseSchema ↔ serializeSchema round-trip", () => {
  it("parse(serialize(model)) ≡ model (ignoring client ids)", () => {
    const model = seed();
    const back = parseSchema(serializeSchema(model));
    expect(stripIds(back)).toEqual(stripIds(model));
  });

  it("serialize(parse(turtle)) is idempotent", () => {
    const ttl = serializeSchema(seed());
    expect(serializeSchema(parseSchema(ttl))).toBe(ttl);
  });

  it("recovers the NumberFieldEditor widget via the numeric-datatype heuristic", () => {
    const back = parseSchema(serializeSchema(seed()));
    const dist = back.shapes.find((s) => s.shapeIri === ":DistributionShape");
    expect(dist?.groups[0]?.fields[0]?.widgetId).toBe("NumberFieldEditor");
  });

  it("recovers both shapes and the declared prefixes", () => {
    const back = parseSchema(serializeSchema(seed()));
    expect(back.shapes.map((s) => s.shapeIri).sort()).toEqual([":DatasetShape", ":DistributionShape"]);
    expect(back.prefixes).toEqual(PREFIXES);
  });

  it("throws ShaclParseError on malformed Turtle", () => {
    expect(() => parseSchema("this is not turtle <<<")).toThrow();
  });
});

describe("losslessness for arbitrary input (residual pass-through)", () => {
  // Uses SHACL features the model can't represent: a second rdf:type, sh:closed,
  // an sh:or list of blank nodes, sh:hasValue, and a whole separate subject.
  const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix ex: <http://ex.org/> .
@prefix : <http://fairdatapoint.org/> .

:GeneralGroup a sh:PropertyGroup ; rdfs:label "General" ; sh:order 0 .

:DatasetShape a sh:NodeShape, owl:Class ;
  rdfs:label "Dataset" ;
  sh:targetClass ex:Dataset ;
  sh:closed true ;
  sh:property [
    sh:path dct:title ;
    sh:name "Title" ;
    sh:minCount 1 ;
    sh:group :GeneralGroup ;
    sh:or ( [ sh:datatype xsd:string ] [ sh:datatype xsd:anyURI ] ) ;
    sh:hasValue "x"
  ] .

ex:SomeOntology a owl:Ontology ; rdfs:label "Vocab" .`;

  const triples = (t: string) => new Parser().parse(t).length;

  it("drops no triples: parse → serialize preserves the triple count", () => {
    const out = serializeSchema(parseSchema(ttl));
    expect(triples(out)).toBe(triples(ttl));
  });

  it("re-emits the unmodeled features", () => {
    const out = serializeSchema(parseSchema(ttl));
    expect(out).toContain("sh:closed");
    expect(out).toContain("sh:or (");
    expect(out).toContain("sh:hasValue");
    expect(out).toContain("a owl:Class"); // the extra shape type
    expect(out).toContain("ex:SomeOntology"); // the other subject
    expect(() => new Parser().parse(out)).not.toThrow();
  });

  it("is idempotent on its own output", () => {
    const once = serializeSchema(parseSchema(ttl));
    const twice = serializeSchema(parseSchema(once));
    expect(twice).toBe(once);
  });
});

describe("anonymous node shapes (sh:or members) aren't treated as standalone shapes", () => {
  // Mirrors the bundled DCAT Distribution shape: an `sh:or` of `[ a sh:NodeShape ; … ]`
  // members. These must not become editor shapes (they'd show as "n3-482" boxes and
  // serialize to an invalid blank-node-id subject), but must round-trip via residual.
  const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dcat:Distribution a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:or ( [ a sh:NodeShape ; sh:property [ sh:path dcat:downloadURL ; sh:minCount 1 ] ]
          [ a sh:NodeShape ; sh:property [ sh:path dcat:accessURL ; sh:minCount 1 ] ] ) ;
  sh:property [ sh:path dcat:title ; sh:datatype xsd:string ] .`;

  it("parses only the named shape", () => {
    const doc = parseSchema(ttl);
    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0]?.shapeIri).toBe("dcat:Distribution");
  });

  it("round-trips without blank-node-id artefacts, stays valid, and keeps sh:or", () => {
    const out = serializeSchema(parseSchema(ttl));
    expect(out).toContain("sh:or (");
    expect(out).not.toMatch(/\bn3-\d+\b/); // no leaked n3 blank-node labels
    expect(() => new Parser().parse(out)).not.toThrow();
  });
});

describe("value-range constraints (12.24c)", () => {
  const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dcat:Distribution a sh:NodeShape ; sh:targetClass dcat:Distribution ;
  sh:property [ sh:path dcat:byteSize ; sh:datatype xsd:integer ; sh:minInclusive 0 ; sh:maxInclusive 100 ] .`;

  it("captures and re-emits sh:minInclusive/maxInclusive (not duplicated via residual)", () => {
    const doc = parseSchema(ttl);
    const f = doc.shapes[0]?.groups.flatMap((g) => g.fields)[0];
    expect(f?.minInclusive).toBe(0);
    expect(f?.maxInclusive).toBe(100);
    const out = serializeSchema(doc);
    expect((out.match(/sh:minInclusive/g) ?? []).length).toBe(1);
    expect(out).toContain("sh:maxInclusive 100");
    expect(serializeSchema(parseSchema(out))).toBe(out);
  });
});

describe("ungrouped properties stay ungrouped", () => {
  // A property with no sh:group must NOT have one invented on serialize
  // (otherwise removing a group never sticks — it reappears after save).
  const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dcat:Distribution a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:property [ sh:path dcat:byteSize ; sh:datatype xsd:integer ] .`;

  it("does not invent an sh:group for a property that had none", () => {
    const out = serializeSchema(parseSchema(ttl));
    expect(out).not.toContain("sh:group");
    expect(out).not.toContain("PropertyGroup");
    expect(() => new Parser().parse(out)).not.toThrow();
  });
});

describe("node-level sh:or modelled as a kind:'or' group (12.20)", () => {
  it("marks the group whose fields match the sh:or branch paths as kind:'or'", () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .

dcat:Distribution a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:or ( [ sh:property [ sh:path dcat:downloadURL ; sh:minCount 1 ] ]
          [ sh:property [ sh:path dcat:accessURL ; sh:minCount 1 ] ] ) ;
  sh:property [ sh:path dcat:downloadURL ; sh:group <http://x/g> ; sh:order 0 ] ;
  sh:property [ sh:path dcat:accessURL ; sh:group <http://x/g> ; sh:order 1 ] .
<http://x/g> a sh:PropertyGroup ; rdfs:label "Access" ; sh:order 0 .`;
    const doc = parseSchema(ttl);
    const or = doc.shapes[0]?.groups.find((g) => g.kind === "or");
    expect(or?.label).toBe("Access");
    expect(or?.fields.map((f) => f.path)).toEqual(["dcat:downloadURL", "dcat:accessURL"]);

    const out = serializeSchema(doc);
    expect(out).toContain("sh:or (");
    // Canonical W3C form: members are property shapes (sh:path directly).
    expect(out).toContain("[ sh:path dcat:downloadURL ; sh:minCount 1 ]");
    expect(() => new Parser().parse(out)).not.toThrow();
    expect(serializeSchema(parseSchema(out))).toBe(out); // stable round-trip
  });

  it("makes or-group members individually optional (no top-level sh:minCount)", () => {
    // Even though the members carry minCount 1 at the top level, the requirement
    // belongs to the sh:or — emitting per-member minCount would require *both*.
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .

dcat:Distribution a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:or ( [ sh:property [ sh:path dcat:downloadURL ; sh:minCount 1 ] ]
          [ sh:property [ sh:path dcat:accessURL ; sh:minCount 1 ] ] ) ;
  sh:property [ sh:path dcat:downloadURL ; sh:minCount 1 ; sh:group <http://x/g> ; sh:order 0 ] ;
  sh:property [ sh:path dcat:accessURL ; sh:minCount 1 ; sh:group <http://x/g> ; sh:order 1 ] .
<http://x/g> a sh:PropertyGroup ; rdfs:label "Access" ; sh:order 0 .`;
    const out = serializeSchema(parseSchema(ttl));
    const or = parseSchema(out).shapes[0]?.groups.find((g) => g.kind === "or");
    expect(or?.fields.every((f) => f.minCount === null)).toBe(true);
    expect(out).toContain("sh:or ("); // the requirement still lives here
    expect(() => new Parser().parse(out)).not.toThrow();
  });

  it("synthesises an or-group when the sh:or paths have no top-level property", () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dcat:Distribution a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:or ( [ a sh:NodeShape ; sh:property [ sh:path dcat:downloadURL ; sh:minCount 1 ] ]
          [ a sh:NodeShape ; sh:property [ sh:path dcat:accessURL ; sh:minCount 1 ] ] ) ;
  sh:property [ sh:path dcat:title ; sh:datatype xsd:string ] .`;
    const doc = parseSchema(ttl);
    const or = doc.shapes[0]?.groups.find((g) => g.kind === "or");
    expect(or?.fields.map((f) => f.path)).toEqual(["dcat:downloadURL", "dcat:accessURL"]);
    const out = serializeSchema(doc);
    expect(out).toContain("sh:path dcat:downloadURL");
    expect(() => new Parser().parse(out)).not.toThrow();
  });

  it("leaves a non-matching sh:or (no single property per branch) in residual", () => {
    const complex = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dcat:Distribution a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:or ( [ sh:datatype xsd:string ] [ sh:datatype xsd:anyURI ] ) .`;
    const doc = parseSchema(complex);
    expect(doc.shapes[0]?.groups.some((g) => g.kind === "or")).toBe(false);
    expect(serializeSchema(doc)).toContain("sh:or (");
  });
});
