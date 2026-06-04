import { describe, expect, it } from "vitest";
import { Parser } from "n3";
import { PREFIXES } from "@/rdf/namespaces";
import { serializeSchema, groupIri } from "./serialize";
import type { Field, SchemaDocument } from "./model";

/** A complete field with sensible empties, overridden per test. */
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

/** Seed mirroring the handoff SEED_SCHEMA (Dataset shape), as a multi-shape doc. */
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
        ],
      },
    ],
  };
}

describe("serializeSchema", () => {
  it("emits valid Turtle that n3 can parse", () => {
    const ttl = serializeSchema(seed());
    expect(() => new Parser().parse(ttl)).not.toThrow();
  });

  it("emits the prefix set plus the default namespace", () => {
    const ttl = serializeSchema(seed());
    expect(ttl).toContain("@prefix sh: <http://www.w3.org/ns/shacl#> .");
    expect(ttl).toContain("@prefix : <http://fairdatapoint.org/> .");
  });

  it("emits the NodeShape with its target class and label/comment", () => {
    const ttl = serializeSchema(seed());
    expect(ttl).toContain(":DatasetShape");
    expect(ttl).toContain("a sh:NodeShape");
    expect(ttl).toContain('rdfs:label "Dataset"');
    expect(ttl).toContain('rdfs:comment "A DCAT-style dataset metadata schema"');
    expect(ttl).toContain("sh:targetClass dcat:Dataset");
  });

  it("emits a property group block referenced by sh:group", () => {
    const ttl = serializeSchema(seed());
    const iri = groupIri("General information");
    expect(iri).toBe(":GeneralinformationGroup");
    expect(ttl).toContain(`${iri}\n  a sh:PropertyGroup ;`);
    expect(ttl).toContain(`sh:group ${iri}`);
  });

  it("emits sh:in as an RDF list of quoted literals", () => {
    const ttl = serializeSchema(seed());
    expect(ttl).toContain('sh:in ( "public" "restricted" )');
  });

  it("closes the shape with '.' on the last property only", () => {
    const ttl = serializeSchema(seed());
    expect(ttl.trimEnd().endsWith("] .")).toBe(true);
  });

  it("omits unset terms (no empty datatype/pattern/order noise)", () => {
    const ttl = serializeSchema({
      prefixes: PREFIXES,
      shapes: [
        {
          id: "s",
          shapeIri: ":Bare",
          label: "",
          comment: "",
          targetClass: "",
          groups: [{ id: "g", label: "G", order: 0, fields: [field({ path: "dct:x", order: 0 })] }],
        },
      ],
    });
    expect(ttl).not.toContain("sh:datatype");
    expect(ttl).not.toContain("sh:pattern");
    expect(ttl).not.toContain("rdfs:comment");
  });

  it("is deterministic — serializing twice yields identical output", () => {
    expect(serializeSchema(seed())).toBe(serializeSchema(seed()));
  });

  it("escapes quotes and newlines in literals", () => {
    const ttl = serializeSchema({
      prefixes: PREFIXES,
      shapes: [
        {
          id: "s",
          shapeIri: ":S",
          label: 'He said "hi"\nbye',
          comment: "",
          targetClass: "",
          groups: [],
        },
      ],
    });
    expect(ttl).toContain('rdfs:label "He said \\"hi\\"\\nbye"');
    expect(() => new Parser().parse(ttl)).not.toThrow();
  });
});
