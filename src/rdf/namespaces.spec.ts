import { describe, expect, it } from "vitest";
import { compactIri } from "./namespaces";

describe("compactIri", () => {
  it("compacts standard-namespace IRIs", () => {
    expect(compactIri("http://www.w3.org/ns/dcat#Dataset")).toBe("dcat:Dataset");
    expect(compactIri("http://www.w3.org/ns/shacl#NodeShape")).toBe("sh:NodeShape");
    expect(compactIri("http://fairdatapoint.org/MyShape")).toBe(":MyShape");
  });

  it("prefers a document-declared prefix and longest match", () => {
    expect(compactIri("http://ex.org/v1/Thing", [{ prefix: "ex", uri: "http://ex.org/v1/" }])).toBe("ex:Thing");
  });

  it("passes non-IRIs and unknown IRIs through unchanged", () => {
    expect(compactIri("dcat:Dataset")).toBe("dcat:Dataset");
    expect(compactIri("http://unknown.example/Thing")).toBe("http://unknown.example/Thing");
  });
});
