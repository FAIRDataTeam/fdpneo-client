/**
 * Round-trip tests: generate Turtle from a schema, parse it back, and verify
 * the resulting schema is semantically equivalent to the original.
 *
 * These catch regressions where the generator and parser go out of sync.
 */
import { describe, it, expect } from 'vitest';
import { parseShacl, generateShacl } from '../shacl';
import type { Schema } from '../types';

function roundtrip(schema: Schema): Schema {
  const turtle = generateShacl(schema);
  const result = parseShacl(turtle);
  if (!result.schema) {
    throw new Error(`Round-trip parse failed: ${result.error}`);
  }
  return result.schema;
}

function baseSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    schemaName: 'Test',
    schemaDescription: '',
    shapeIri: ':TestShape',
    targetClass: ':Test',
    prefixes: [
      { prefix: 'sh',   uri: 'http://www.w3.org/ns/shacl#' },
      { prefix: 'dash', uri: 'http://datashapes.org/dash#' },
      { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
      { prefix: 'xsd',  uri: 'http://www.w3.org/2001/XMLSchema#' },
      { prefix: 'dct',  uri: 'http://purl.org/dc/terms/' },
      { prefix: '',     uri: 'http://example.org/' },
    ],
    groups: [],
    nestedShapes: [],
    ...overrides,
  };
}

function field(overrides = {}): Schema['groups'][0]['fields'][0] {
  return {
    id: 'f1',
    widgetId: 'TextFieldEditor',
    name: 'Title',
    description: 'A title field',
    path: 'dct:title',
    order: 0,
    nodeKind: 'sh:Literal',
    datatype: 'xsd:string',
    class: null,
    node: null,
    minCount: 1,
    maxCount: 1,
    minLength: null,
    maxLength: null,
    pattern: '',
    defaultValue: '',
    inValues: null,
    ...overrides,
  };
}

describe('shacl round-trip', () => {
  it('preserves targetClass', () => {
    const schema = baseSchema({ targetClass: ':MyClass' });
    expect(roundtrip(schema).targetClass).toBe(':MyClass');
  });

  it('preserves schemaName via rdfs:label', () => {
    const schema = baseSchema({ schemaName: 'My Schema' });
    expect(roundtrip(schema).schemaName).toBe('My Schema');
  });

  it('preserves shape IRI', () => {
    const schema = baseSchema({ shapeIri: ':DatasetShape' });
    expect(roundtrip(schema).shapeIri).toBe(':DatasetShape');
  });

  it('preserves prefix declarations', () => {
    const schema = baseSchema();
    const rt = roundtrip(schema);
    const uris = rt.prefixes.map((p) => p.uri);
    expect(uris).toContain('http://www.w3.org/ns/shacl#');
    expect(uris).toContain('http://example.org/');
  });

  it('preserves field path and name', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field()] }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.path).toBe('dct:title');
    expect(f.name).toBe('Title');
  });

  it('preserves field minCount / maxCount', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ minCount: 1, maxCount: 3 })] }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.minCount).toBe(1);
    expect(f.maxCount).toBe(3);
  });

  it('preserves sh:in literal values', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ widgetId: 'EnumSelectEditor', inValues: [
          { value: 'a', kind: 'literal' }, { value: 'b', kind: 'literal' }, { value: 'c', kind: 'literal' },
        ] })],
      }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.inValues).toEqual([
      { value: 'a', kind: 'literal' }, { value: 'b', kind: 'literal' }, { value: 'c', kind: 'literal' },
    ]);
  });

  it('preserves sh:in IRI values as IRIs', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ widgetId: 'EnumSelectEditor', nodeKind: 'sh:IRI', datatype: null, inValues: [
          { value: 'ex:A', kind: 'iri' }, { value: 'ex:B', kind: 'iri' },
        ] })],
      }],
      prefixes: [
        ...baseSchema().prefixes,
        { prefix: 'ex', uri: 'http://example.com/' },
      ],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.inValues).toEqual([
      { value: 'ex:A', kind: 'iri' }, { value: 'ex:B', kind: 'iri' },
    ]);
  });

  it('preserves schema description via dct:description', () => {
    const schema = baseSchema({ schemaDescription: 'A round-tripped description.' });
    expect(roundtrip(schema).schemaDescription).toBe('A round-tripped description.');
  });

  it('preserves a language tag on the primary label', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ name: 'Title', nameLang: 'en' })] }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.name).toBe('Title');
    expect(f.nameLang).toBe('en');
  });

  it('preserves multilingual labels (sh:name in several languages)', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({
          name: 'Title', nameLang: 'en',
          nameI18n: [{ lang: 'pt', value: 'Título' }, { lang: 'nl', value: 'Titel' }],
        })],
      }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.name).toBe('Title');
    expect(f.nameLang).toBe('en');
    expect(f.nameI18n).toEqual([{ lang: 'pt', value: 'Título' }, { lang: 'nl', value: 'Titel' }]);
  });

  it('leaves an untagged label untagged', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ name: 'Title' })] }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.name).toBe('Title');
    expect(f.nameLang).toBeUndefined();
    expect(f.nameI18n).toBeUndefined();
  });

  it('preserves sh:message and sh:severity', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ message: 'Title is required', severity: 'sh:Warning' })],
      }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.message).toBe('Title is required');
    expect(f.severity).toBe('sh:Warning');
  });

  it('does not push modeled message/severity into residual', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ message: 'x', severity: 'sh:Info' })] }],
    });
    const rt = roundtrip(schema);
    expect(rt.residual).toBeUndefined();
  });

  it('preserves an inverse path', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ path: 'dct:isPartOf', inversePath: true })] }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.path).toBe('dct:isPartOf');
    expect(f.inversePath).toBe(true);
    expect(generateShacl(schema)).toContain('sh:path [ sh:inversePath dct:isPartOf ]');
  });

  it('preserves sh:or alternative value types', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ orTypes: [{ nodeKind: 'sh:Literal' }, { nodeKind: 'sh:IRI' }] })],
      }],
    });
    const out = generateShacl(schema);
    expect(out).toContain('sh:or (');
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.orTypes).toEqual([{ nodeKind: 'sh:Literal' }, { nodeKind: 'sh:IRI' }]);
    expect(rt.residual).toBeUndefined(); // modeled, not residual
  });

  it('preserves value-range bounds', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ widgetId: 'NumberFieldEditor', datatype: 'xsd:integer', minInclusive: '0', maxInclusive: '100' })],
      }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.minInclusive).toBe('0');
    expect(f.maxInclusive).toBe('100');
  });

  it('preserves widget type via dash:editor', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ widgetId: 'DatePickerEditor' })] }],
    });
    const rt = roundtrip(schema);
    expect(rt.groups.flatMap((g) => g.fields)[0]!.widgetId).toBe('DatePickerEditor');
  });

  it('preserves group label', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'My Section', order: 0, fields: [field()] }],
    });
    const rt = roundtrip(schema);
    expect(rt.groups[0]!.label).toBe('My Section');
  });

  it('preserves field-to-group assignment', () => {
    const schema = baseSchema({
      groups: [
        { id: 'g1', label: 'Alpha', order: 0, fields: [field({ id: 'f1', path: ':a' })] },
        { id: 'g2', label: 'Beta',  order: 1, fields: [field({ id: 'f2', path: ':b', order: 1 })] },
      ],
    });
    const rt = roundtrip(schema);
    const alphaGroup = rt.groups.find((g) => g.label === 'Alpha');
    const betaGroup  = rt.groups.find((g) => g.label === 'Beta');
    expect(alphaGroup!.fields.map((f) => f.path)).toEqual([':a']);
    expect(betaGroup!.fields.map((f) => f.path)).toEqual([':b']);
  });

  it('preserves nested shape IRI and targetClass', () => {
    const schema = baseSchema({
      prefixes: [...baseSchema().prefixes, { prefix: 'foaf', uri: 'http://xmlns.com/foaf/0.1/' }],
      nestedShapes: [{ id: 'ns1', iri: ':AgentShape', targetClass: 'foaf:Person', fields: [] }],
    });
    const rt = roundtrip(schema);
    expect(rt.nestedShapes).toHaveLength(1);
    expect(rt.nestedShapes[0]!.iri).toBe(':AgentShape');
    expect(rt.nestedShapes[0]!.targetClass).toBe('foaf:Person');
  });

  it('preserves nested shape fields', () => {
    const schema = baseSchema({
      nestedShapes: [{
        id: 'ns1',
        iri: ':NS',
        targetClass: '',
        fields: [
          field({ id: 'nf1', path: ':x', name: 'X', order: 0 }),
          field({ id: 'nf2', path: ':y', name: 'Y', order: 1 }),
        ],
      }],
    });
    const rt = roundtrip(schema);
    const ns = rt.nestedShapes[0]!;
    expect(ns.fields.map((f) => f.path)).toEqual([':x', ':y']);
    expect(ns.fields.map((f) => f.name)).toEqual(['X', 'Y']);
  });

  it('preserves sh:node reference from main field to nested shape', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ widgetId: 'DetailsEditor', node: ':AgentShape', nodeKind: 'sh:BlankNodeOrIRI' })],
      }],
      nestedShapes: [{ id: 'ns1', iri: ':AgentShape', targetClass: ':Agent', fields: [] }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.node).toBe(':AgentShape');
  });

  it('preserves string values with special characters', () => {
    const schema = baseSchema({
      groups: [{
        id: 'g1', label: 'G', order: 0,
        fields: [field({ name: 'Say "hello"', description: 'Line1\nLine2' })],
      }],
    });
    const rt = roundtrip(schema);
    const f = rt.groups.flatMap((g) => g.fields)[0]!;
    expect(f.name).toBe('Say "hello"');
  });
});
