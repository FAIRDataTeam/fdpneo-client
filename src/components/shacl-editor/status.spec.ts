import { describe, expect, it } from "vitest";
import { shaclStatus } from "./status";
import { serializeSchema } from "./serialize";
import { emptyDocument } from "./factories";

describe("shaclStatus", () => {
  it("treats empty input as ok with zero counts", () => {
    expect(shaclStatus("   ")).toEqual({ ok: true, shapes: 0, properties: 0, error: null });
  });

  it("counts shapes and recognised properties of valid Turtle", () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix : <http://fairdatapoint.org/> .
:S a sh:NodeShape ;
  sh:targetClass dct:Agent ;
  sh:property [ sh:path dct:title ] ;
  sh:property [ sh:path dct:description ] .`;
    const s = shaclStatus(ttl);
    expect(s.ok).toBe(true);
    expect(s.shapes).toBe(1);
    expect(s.properties).toBe(2);
    expect(s.error).toBeNull();
  });

  it("reports an error on malformed Turtle", () => {
    const s = shaclStatus("not turtle <<<");
    expect(s.ok).toBe(false);
    expect(s.error).toBeTruthy();
  });

  it("agrees with the serializer for a generated document", () => {
    const s = shaclStatus(serializeSchema(emptyDocument()));
    expect(s.ok).toBe(true);
    expect(s.shapes).toBe(1);
  });
});
