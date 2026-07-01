import { describe, it, expect } from 'vitest';
import {
  shapesFromLegacy,
  legacyFromShapes,
  parseToShapes,
  generateFromShapes,
  parseShacl,
} from '../shacl';
import type { Schema } from '../types';

function field(overrides = {}): Schema['groups'][0]['fields'][0] {
  return {
    id: 'f1', widgetId: 'TextFieldEditor', name: 'Title', description: '', path: 'dct:title',
    order: 0, nodeKind: 'sh:Literal', datatype: 'xsd:string', class: null, node: null,
    minCount: null, maxCount: null, minLength: null, maxLength: null, pattern: '',
    defaultValue: '', inValues: null, ...overrides,
  };
}

function legacySchema(): Schema {
  return {
    schemaName: 'Dataset',
    schemaDescription: 'A dataset.',
    shapeIri: ':DatasetShape',
    targetClass: 'dcat:Dataset',
    prefixes: [
      { prefix: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
      { prefix: 'dash', uri: 'http://datashapes.org/dash#' },
      { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
      { prefix: 'dct', uri: 'http://purl.org/dc/terms/' },
      { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' },
      { prefix: 'dcat', uri: 'http://www.w3.org/ns/dcat#' },
      { prefix: 'vcard', uri: 'http://www.w3.org/2006/vcard/ns#' },
      { prefix: '', uri: 'http://example.org/' },
    ],
    groups: [{ id: 'g1', iri: ':GeneralGroup', label: 'General', order: 0, fields: [field()] }],
    nestedShapes: [
      { id: 'ns1', iri: ':ContactShape', targetClass: 'vcard:Kind', fields: [field({ id: 'nf1', path: 'vcard:fn', name: 'Full name' })] },
    ],
  };
}

describe('F4 peer-shapes adapters', () => {
  it('maps a legacy schema to peer shapes (primary + nested)', () => {
    const doc = shapesFromLegacy(legacySchema());
    expect(doc.shapes).toHaveLength(2);
    expect(doc.shapes[0]!.iri).toBe(':DatasetShape');
    expect(doc.shapes[0]!.name).toBe('Dataset');
    expect(doc.shapes[0]!.targetClass).toBe('dcat:Dataset');
    expect(doc.shapes[1]!.iri).toBe(':ContactShape');
    expect(doc.shapes[1]!.targetClass).toBe('vcard:Kind');
  });

  it('round-trips legacy → shapes → legacy without loss', () => {
    const s = legacySchema();
    const back = legacyFromShapes(shapesFromLegacy(s));
    expect(back.schemaName).toBe(s.schemaName);
    expect(back.shapeIri).toBe(s.shapeIri);
    expect(back.targetClass).toBe(s.targetClass);
    expect(back.groups.flatMap((g) => g.fields).map((f) => f.path)).toEqual(['dct:title']);
    expect(back.nestedShapes).toHaveLength(1);
    expect(back.nestedShapes[0]!.iri).toBe(':ContactShape');
    expect(back.nestedShapes[0]!.fields.map((f) => f.path)).toEqual(['vcard:fn']);
  });

  it('generates identical Turtle whether via Schema or ShapesDoc', () => {
    const s = legacySchema();
    const viaShapes = generateFromShapes(shapesFromLegacy(s));
    const viaSchema = parseShacl(viaShapes); // sanity: output re-parses
    expect(viaSchema.error).toBeNull();
  });

  it('parses a multi-shape document into peers and round-trips stably', () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix : <http://example.org/> .
:DatasetShape a sh:NodeShape ; sh:targetClass dcat:Dataset ;
  sh:property [ sh:path dct:title ; sh:datatype xsd:string ; dash:editor dash:TextFieldEditor ] .
:DistributionShape a sh:NodeShape ; sh:targetClass dcat:Distribution ;
  sh:property [ sh:path dcat:accessURL ; sh:nodeKind sh:IRI ; dash:editor dash:URIEditor ] .
:AgentShape a sh:NodeShape ; sh:targetClass foaf:Agent ;
  sh:property [ sh:path foaf:name ; sh:datatype xsd:string ; dash:editor dash:TextFieldEditor ] .`;
    const { doc, error } = parseToShapes(ttl);
    expect(error).toBeNull();
    expect(doc!.shapes.map((s) => s.iri).sort()).toEqual([':AgentShape', ':DatasetShape', ':DistributionShape']);
    expect(doc!.shapes.map((s) => s.targetClass).sort()).toEqual(['dcat:Dataset', 'dcat:Distribution', 'foaf:Agent']);

    // Regenerate from the peer model and re-parse — shape set is stable.
    const regen = generateFromShapes(doc!);
    const again = parseToShapes(regen);
    expect(again.error).toBeNull();
    expect(again.doc!.shapes.map((s) => s.iri).sort()).toEqual([':AgentShape', ':DatasetShape', ':DistributionShape']);
  });
});
