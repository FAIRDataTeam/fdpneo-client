import { describe, expect, it } from "vitest";
import { specFromDefinition, type ResourceTypeDef } from "./resourceDefinitions";
import { NS } from "./rdf";

function def(partial: Partial<ResourceTypeDef>): ResourceTypeDef {
  return {
    slug: "x",
    urlPrefix: "x",
    name: "X",
    schemaIri: "http://example.org/X",
    isRoot: false,
    children: [],
    ...partial,
  };
}

describe("specFromDefinition", () => {
  it("maps a server definition onto an EntitySpec", () => {
    const spec = specFromDefinition(
      def({
        urlPrefix: "ontology",
        name: "Ontology",
        schemaIri: "http://localhost:8000/shapes/Ontology",
        children: [
          { relationUri: `${NS.dcat}dataset`, target: "term", targetName: "Term", title: "Terms" },
        ],
      }),
    );
    expect(spec.type).toBe("ontology");
    expect(spec.prefix).toBe("ontology");
    expect(spec.label).toBe("Ontology");
    expect(spec.classIri).toBe("http://localhost:8000/shapes/Ontology");
    // childTypes are the target url-prefixes — so a runtime child link shows
    // up wherever childTypes drives the UI (browse / "new child").
    expect(spec.childTypes).toEqual(["term"]);
    // A runtime type has no static fields; the SHACL /spec endpoint supplies them.
    expect(spec.fields).toEqual([]);
  });

  it("reuses the static DCAT fallback fields for a known prefix", () => {
    const spec = specFromDefinition(
      def({ urlPrefix: "dataset", name: "Dataset", schemaIri: `${NS.dcat}Dataset` }),
    );
    const keys = spec.fields.map((f) => f.key);
    expect(keys).toContain("keywords");
    expect(keys).toContain("theme");
  });

  it("drops empty child targets", () => {
    const spec = specFromDefinition(
      def({
        children: [
          { relationUri: "r", target: "", targetName: "", title: "" },
          { relationUri: "r", target: "good", targetName: "Good", title: "" },
        ],
      }),
    );
    expect(spec.childTypes).toEqual(["good"]);
  });
});
