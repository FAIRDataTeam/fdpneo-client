import { describe, expect, it } from "vitest";
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
