import { describe, expect, it } from "vitest";
import { Parser } from "n3";
import { shaclStatus, tidyTurtle } from "./status";
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

describe("tidyTurtle", () => {
  // A messy but valid shape that also uses a feature the model doesn't capture
  // (sh:closed) — Tidy must keep every triple.
  const messy = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix    ex: <http://ex.org/> .
ex:S    a    sh:NodeShape;sh:closed true;
sh:property [ sh:path dct:title;sh:minCount 1 ] .`;

  it("preserves every triple (lossless), including unmodeled ones", async () => {
    const out = await tidyTurtle(messy);
    const before = new Parser().parse(messy).length;
    const after = new Parser().parse(out).length;
    expect(after).toBe(before);
    expect(out).toContain("sh:closed");
  });

  it("produces valid Turtle that re-parses", async () => {
    const out = await tidyTurtle(messy);
    expect(() => new Parser().parse(out)).not.toThrow();
  });

  it("rejects invalid Turtle", async () => {
    await expect(tidyTurtle("this is not turtle <<<")).rejects.toBeTruthy();
  });
});
