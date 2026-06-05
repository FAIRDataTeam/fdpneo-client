import { describe, expect, it } from "vitest";
import { expandPath, fieldViolations, shapeViolationCounts } from "./violations";
import { newField } from "./factories";
import type { SchemaDocument } from "./model";

const PREFIXES = [
  { prefix: "dct", uri: "http://purl.org/dc/terms/" },
  { prefix: "dcat", uri: "http://www.w3.org/ns/dcat#" },
];

function doc(): SchemaDocument {
  const title = newField("TextFieldEditor");
  title.id = "f-title";
  title.path = "dct:title";
  const dist = newField("URIEditor");
  dist.id = "f-dist";
  dist.path = "dcat:distribution";
  return {
    prefixes: PREFIXES,
    shapes: [
      { id: "s1", shapeIri: ":DatasetShape", label: "Dataset", comment: "", targetClass: "dcat:Dataset",
        groups: [{ id: "g1", label: "G", order: 0, fields: [title, dist] }] },
    ],
  };
}

describe("expandPath", () => {
  it("expands prefixed names and passes IRIs through", () => {
    expect(expandPath("dct:title", PREFIXES)).toBe("http://purl.org/dc/terms/title");
    expect(expandPath(":Foo", PREFIXES)).toBe("http://fairdatapoint.org/Foo");
    expect(expandPath("http://x/y", PREFIXES)).toBe("http://x/y");
  });
  it("falls back to standard namespaces for undeclared prefixes", () => {
    expect(expandPath("sh:name", [])).toBe("http://www.w3.org/ns/shacl#name");
  });
});

describe("fieldViolations", () => {
  it("maps a violation's resultPath (full IRI) to the matching field id", () => {
    const map = fieldViolations(doc(), [
      { resultPath: "http://purl.org/dc/terms/title", message: "Missing required value" },
    ]);
    expect(map.get("f-title")).toEqual(["Missing required value"]);
    expect(map.has("f-dist")).toBe(false);
  });

  it("collects multiple messages and ignores pathless violations", () => {
    const map = fieldViolations(doc(), [
      { resultPath: "http://purl.org/dc/terms/title", message: "too short" },
      { resultPath: "http://purl.org/dc/terms/title", message: "bad pattern" },
      { resultPath: null, message: "shape-level" },
    ]);
    expect(map.get("f-title")).toEqual(["too short", "bad pattern"]);
  });
});

describe("shapeViolationCounts", () => {
  it("counts violating fields per shape", () => {
    const counts = shapeViolationCounts(doc(), [
      { resultPath: "http://purl.org/dc/terms/title", message: "x" },
    ]);
    expect(counts.get(":DatasetShape")).toBe(1);
  });
});
