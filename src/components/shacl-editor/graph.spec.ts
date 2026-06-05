import { describe, expect, it } from "vitest";
import { buildShapeGraph } from "./graph";
import { newField } from "./factories";
import type { SchemaDocument } from "./model";

function doc(): SchemaDocument {
  const link = newField("DetailsEditor");
  link.path = "dcat:distribution";
  link.node = ":DistributionShape"; // sh:node link
  const byClass = newField("AutoCompleteEditor");
  byClass.path = "dcat:contactPoint";
  byClass.class = "vcard:Kind"; // sh:class link (no matching IRI)
  const plain = newField("TextFieldEditor");
  plain.path = "dct:title";

  return {
    prefixes: [],
    shapes: [
      {
        id: "s1", shapeIri: ":DatasetShape", label: "Dataset", comment: "",
        targetClass: "dcat:Dataset",
        groups: [{ id: "g1", label: "G", order: 0, fields: [plain, link, byClass] }],
      },
      {
        id: "s2", shapeIri: ":DistributionShape", label: "Distribution", comment: "",
        targetClass: "dcat:Distribution",
        groups: [{ id: "g2", label: "G", order: 0, fields: [] }],
      },
      {
        id: "s3", shapeIri: ":ContactShape", label: "Contact", comment: "",
        targetClass: "vcard:Kind",
        groups: [{ id: "g3", label: "G", order: 0, fields: [] }],
      },
    ],
  };
}

describe("buildShapeGraph", () => {
  it("emits one node per shape with property counts", () => {
    const { nodes } = buildShapeGraph(doc());
    expect(nodes.map((n) => n.id)).toEqual(["s1", "s2", "s3"]);
    expect(nodes.find((n) => n.id === "s1")?.propertyCount).toBe(3);
    expect(nodes.find((n) => n.id === "s2")?.propertyCount).toBe(0);
  });

  it("emits node keys (shape IRIs)", () => {
    const { nodes } = buildShapeGraph(doc());
    expect(nodes.map((n) => n.key)).toEqual([":DatasetShape", ":DistributionShape", ":ContactShape"]);
    expect(nodes.every((n) => !n.ghost)).toBe(true);
  });

  it("links via sh:node (by shape IRI), edges keyed by shapeIri", () => {
    const { edges } = buildShapeGraph(doc());
    const e = edges.find((x) => x.source === ":DatasetShape" && x.target === ":DistributionShape");
    expect(e).toBeTruthy();
    expect(e?.kind).toBe("node");
    expect(e?.via).toBe("dcat:distribution");
  });

  it("links via sh:class (by target class)", () => {
    const { edges } = buildShapeGraph(doc());
    const e = edges.find((x) => x.source === ":DatasetShape" && x.target === ":ContactShape");
    expect(e?.kind).toBe("class");
    expect(e?.via).toBe("dcat:contactPoint");
  });

  it("ignores plain literal fields and self-links", () => {
    const { edges } = buildShapeGraph(doc());
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.source !== e.target)).toBe(true);
  });

  it("prefers sh:node over sh:class when both resolve", () => {
    const f = newField("DetailsEditor");
    f.node = ":BShape";
    f.class = "ex:B"; // both point at shape B
    const d: SchemaDocument = {
      prefixes: [],
      shapes: [
        { id: "a", shapeIri: ":AShape", label: "A", comment: "", targetClass: "ex:A", groups: [{ id: "ga", label: "G", order: 0, fields: [f] }] },
        { id: "b", shapeIri: ":BShape", label: "B", comment: "", targetClass: "ex:B", groups: [{ id: "gb", label: "G", order: 0, fields: [] }] },
      ],
    };
    const { edges } = buildShapeGraph(d);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.kind).toBe("node");
  });

  it("seeds ghost nodes for registered types with no shape", () => {
    const types = [
      { classIri: "dcat:Dataset", label: "Dataset" }, // covered by :DatasetShape
      { classIri: "dcat:Catalog", label: "Catalog" }, // no shape → ghost
    ];
    const { nodes } = buildShapeGraph(doc(), types);
    const ghosts = nodes.filter((n) => n.ghost);
    expect(ghosts.map((g) => g.targetClass)).toEqual(["dcat:Catalog"]);
    expect(ghosts[0]?.key).toBe("ghost:dcat:Catalog");
    // the covered type did not produce a ghost
    expect(nodes.filter((n) => n.targetClass === "dcat:Dataset" && n.ghost)).toHaveLength(0);
  });

  it("links a sh:class to a ghost node", () => {
    const f = newField("AutoCompleteEditor");
    f.path = "dct:publisher";
    f.class = "foaf:Agent"; // no shape, but a registered type
    const d: SchemaDocument = {
      prefixes: [],
      shapes: [
        { id: "a", shapeIri: ":AShape", label: "A", comment: "", targetClass: "ex:A", groups: [{ id: "ga", label: "G", order: 0, fields: [f] }] },
      ],
    };
    const { edges } = buildShapeGraph(d, [{ classIri: "foaf:Agent", label: "Agent" }]);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.target).toBe("ghost:foaf:Agent");
    expect(edges[0]?.kind).toBe("class");
  });
});
