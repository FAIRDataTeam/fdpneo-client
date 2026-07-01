import { describe, it, expect } from 'vitest';
import { parseShacl, serializeSchema } from '../shacl';

// JSON-LD output is dynamically shaped; these helpers navigate it without `any`.
type JsonObj = Record<string, unknown>;
const obj = (v: unknown): JsonObj => (v && typeof v === 'object' ? (v as JsonObj) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const pathId = (p: unknown): string => str(obj(obj(p)['sh:path'])['@id']);

const TTL = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix : <http://example.org/> .
:DatasetShape a sh:NodeShape ; rdfs:label "Dataset" ; sh:targetClass dcat:Dataset ;
  sh:property [ sh:path dct:title ; sh:name "Title" ; sh:datatype xsd:string ; sh:minCount 1 ; dash:editor dash:TextFieldEditor ] ;
  sh:property [ sh:path dct:accessRights ; sh:in ( "public" "private" ) ; dash:editor dash:EnumSelectEditor ] .`;

describe('JSON-LD export', () => {
  const schema = parseShacl(TTL).schema!;
  const out = serializeSchema(schema, 'jsonld');
  const doc = JSON.parse(out) as { '@context': Record<string, string>; '@graph': JsonObj[] };

  it('produces valid JSON', () => {
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('builds a @context from the declared prefixes', () => {
    expect(doc['@context'].dct).toBe('http://purl.org/dc/terms/');
    expect(doc['@context'].dcat).toBe('http://www.w3.org/ns/dcat#');
    // empty prefix maps to @vocab/@base
    expect(doc['@context']['@vocab']).toBe('http://example.org/');
  });

  it('emits the shape with @id, @type and an embedded property', () => {
    const shape = obj(doc['@graph'].find((n) => str(n['@id']).endsWith('DatasetShape')));
    expect(shape['@id']).toBeTruthy();
    expect(shape['@type']).toContain('sh:NodeShape');
    expect(shape['sh:targetClass']).toEqual({ '@id': 'dcat:Dataset' });
    // sh:property blank nodes embedded (referenced once)
    const title = obj(arr(shape['sh:property']).find((p) => pathId(p) === 'dct:title'));
    expect(title['sh:name']).toBe('Title');
    expect(title['sh:minCount']).toBe(1);
  });

  it('collapses sh:in to a JSON-LD @list', () => {
    const shape = obj(doc['@graph'].find((n) => str(n['@id']).endsWith('DatasetShape')));
    const rights = obj(arr(shape['sh:property']).find((p) => pathId(p) === 'dct:accessRights'));
    expect(rights['sh:in']).toEqual({ '@list': ['public', 'private'] });
  });

  it('Turtle remains the default serialization', () => {
    expect(serializeSchema(schema)).toContain('@prefix');
    expect(serializeSchema(schema, 'turtle')).toContain('a sh:NodeShape');
  });
});
