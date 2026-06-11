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

  it("uses the resolved target class as the instance rdf:type, over the schema IRI", () => {
    // Schemas now live under the managed namespace, so the schema IRI is NOT the
    // class IRI — the explicit target class (from the schema list) must win.
    const spec = specFromDefinition(
      def({
        urlPrefix: "catalog",
        name: "Catalog",
        schemaIri: "http://localhost:8000/fdp-api/schemas/catalog",
      }),
      `${NS.dcat}Catalog`,
    );
    expect(spec.classIri).toBe(`${NS.dcat}Catalog`);
  });

  it("falls back to the static DCAT class when no target class is supplied", () => {
    const spec = specFromDefinition(
      def({ urlPrefix: "catalog", name: "Catalog", schemaIri: "http://localhost:8000/fdp-api/schemas/catalog" }),
    );
    expect(spec.classIri).toBe(`${NS.dcat}Catalog`);
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
