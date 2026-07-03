// FDP schemas can declare several peer top-level sh:NodeShapes in one document
// (the old FDP model kept them in `shapes[]`). Contour's engine keeps the first
// as the primary shape and the rest in `nestedShapes[]`, and round-trips them —
// so no multi-shape wrapper is needed (Phase 19.3). This guards that.
import { describe, it, expect } from 'vitest';
import { parseShacl, generateShacl } from '../shacl';

const TWO_PEERS = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix : <http://example.org/> .
:DatasetShape a sh:NodeShape ; rdfs:label "Dataset" ; sh:targetClass dcat:Dataset ;
  sh:property [ sh:path dct:title ; sh:name "Title" ; dash:editor dash:TextFieldEditor ] .
:AgentShape a sh:NodeShape ; rdfs:label "Agent" ; sh:targetClass foaf:Agent ;
  sh:property [ sh:path foaf:name ; sh:name "Name" ; dash:editor dash:TextFieldEditor ] .`;

describe('multi peer-shape handling (Phase 19.3)', () => {
  it('captures a second top-level NodeShape as a peer (nestedShapes)', () => {
    const { schema, error } = parseShacl(TWO_PEERS);
    expect(error).toBeNull();
    expect(schema).not.toBeNull();
    expect(schema!.targetClass).toBe('dcat:Dataset');
    expect(schema!.nestedShapes).toHaveLength(1);
    expect(schema!.nestedShapes[0]!.targetClass).toBe('foaf:Agent');
  });

  it('round-trips both shapes through generate → parse', () => {
    const first = parseShacl(TWO_PEERS).schema!;
    const rt = parseShacl(generateShacl(first)).schema!;
    expect(rt.targetClass).toBe('dcat:Dataset');
    expect(rt.nestedShapes.map((n) => n.targetClass)).toEqual(['foaf:Agent']);
  });
});
