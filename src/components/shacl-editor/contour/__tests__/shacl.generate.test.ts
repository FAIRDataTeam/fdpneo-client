import { describe, it, expect } from 'vitest';
import { generateShacl } from '../shacl';
import type { Schema } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function baseSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    schemaName: 'Test Schema',
    schemaDescription: '',
    shapeIri: ':TestShape',
    targetClass: ':Test',
    prefixes: [
      { prefix: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
      { prefix: 'dash', uri: 'http://datashapes.org/dash#' },
      { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
      { prefix: '', uri: 'http://example.org/' },
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
    description: '',
    path: 'dct:title',
    order: 0,
    nodeKind: 'sh:Literal',
    datatype: 'xsd:string',
    class: null,
    node: null,
    minCount: null,
    maxCount: null,
    minLength: null,
    maxLength: null,
    pattern: '',
    defaultValue: '',
    inValues: null,
    ...overrides,
  };
}

// ── Prefix output ──────────────────────────────────────────────────────────────

describe('generateShacl – prefixes', () => {
  it('emits @prefix lines for all declared prefixes', () => {
    const out = generateShacl(baseSchema());
    expect(out).toContain('@prefix sh: <http://www.w3.org/ns/shacl#> .');
    expect(out).toContain('@prefix dash: <http://datashapes.org/dash#> .');
    expect(out).toContain('@prefix : <http://example.org/> .');
  });

  it('emits the blank prefix without a prefix name', () => {
    const out = generateShacl(baseSchema());
    expect(out).toMatch(/@prefix\s+:\s+<http:\/\/example\.org\/>\s+\./);
  });
});

// ── NodeShape header ───────────────────────────────────────────────────────────

describe('generateShacl – NodeShape header', () => {
  it('emits the shape IRI', () => {
    const out = generateShacl(baseSchema());
    expect(out).toContain(':TestShape');
    expect(out).toContain('a sh:NodeShape');
  });

  it('emits sh:targetClass when set', () => {
    const out = generateShacl(baseSchema());
    expect(out).toContain('sh:targetClass :Test');
  });

  it('emits rdfs:label when schemaName is set', () => {
    const out = generateShacl(baseSchema({ schemaName: 'My Schema' }));
    expect(out).toContain('rdfs:label "My Schema"');
  });

  it('omits rdfs:label when schemaName is empty', () => {
    const out = generateShacl(baseSchema({ schemaName: '' }));
    expect(out).not.toContain('rdfs:label');
  });

  it('ends with a dot when there are no properties', () => {
    const out = generateShacl(baseSchema({ schemaName: '' }));
    // The shape declaration line should end with a dot
    const lines = out.split('\n');
    const shapeLine = lines.findIndex((l) => l.includes('sh:NodeShape'));
    const blockEnd = lines.slice(shapeLine).find((l) => /\.$/.test(l.trim()));
    expect(blockEnd).toBeTruthy();
  });
});

// ── PropertyGroup output ───────────────────────────────────────────────────────

describe('generateShacl – PropertyGroups', () => {
  it('emits a PropertyGroup block for each group', () => {
    const schema = baseSchema({
      groups: [
        { id: 'g1', label: 'Basic', order: 0, fields: [] },
        { id: 'g2', label: 'Provenance', order: 1, fields: [] },
      ],
    });
    const out = generateShacl(schema);
    expect(out).toContain('a sh:PropertyGroup');
    expect(out).toContain('rdfs:label "Basic"');
    expect(out).toContain('rdfs:label "Provenance"');
  });

  it('uses the group label to derive the group IRI when none is stored', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'My Group', order: 0, fields: [] }],
    });
    const out = generateShacl(schema);
    expect(out).toContain(':MyGroupGroup');
  });

  it('uses a stored group IRI verbatim (stable across renames)', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', iri: ':OriginalGroup', label: 'Renamed Label', order: 0, fields: [field()] }],
    });
    const out = generateShacl(schema);
    expect(out).toContain(':OriginalGroup');
    expect(out).toContain('sh:group :OriginalGroup');
    expect(out).not.toContain(':RenamedLabelGroup');
  });
});

// ── sh:property output ────────────────────────────────────────────────────────

describe('generateShacl – sh:property blocks', () => {
  it('emits sh:path', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field()] }],
    });
    const out = generateShacl(schema);
    expect(out).toContain('sh:path dct:title');
  });

  it('emits sh:name when set', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ name: 'My Title' })] }] }),
    );
    expect(out).toContain('sh:name "My Title"');
  });

  it('omits sh:name when empty', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ name: '' })] }] }),
    );
    expect(out).not.toContain('sh:name');
  });

  it('emits sh:nodeKind when set', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ nodeKind: 'sh:IRI' })] }] }),
    );
    expect(out).toContain('sh:nodeKind sh:IRI');
  });

  it('emits sh:datatype when set', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field()] }] }),
    );
    expect(out).toContain('sh:datatype xsd:string');
  });

  it('emits sh:class when set', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ class: 'foaf:Agent' })] }] }),
    );
    expect(out).toContain('sh:class foaf:Agent');
  });

  it('emits sh:node for DetailsEditor fields', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{
          id: 'g1', label: 'G', order: 0,
          fields: [field({ widgetId: 'DetailsEditor', node: ':AgentShape' })],
        }],
      }),
    );
    expect(out).toContain('sh:node :AgentShape');
  });

  it('omits sh:node when null', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field()] }] }),
    );
    // Must not emit the sh:node predicate (note: sh:nodeKind is a different predicate)
    expect(out).not.toMatch(/\bsh:node\s/);
  });

  it('emits sh:minCount / sh:maxCount when set', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ minCount: 1, maxCount: 5 })] }],
      }),
    );
    expect(out).toContain('sh:minCount 1');
    expect(out).toContain('sh:maxCount 5');
  });

  it('omits sh:minCount when null', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ minCount: null })] }] }),
    );
    expect(out).not.toContain('sh:minCount');
  });

  it('emits sh:in list of literals', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{
          id: 'g1', label: 'G', order: 0,
          fields: [field({ widgetId: 'EnumSelectEditor', inValues: [
            { value: 'a', kind: 'literal' }, { value: 'b', kind: 'literal' }, { value: 'c', kind: 'literal' },
          ] })],
        }],
      }),
    );
    expect(out).toContain('sh:in ( "a" "b" "c" )');
  });

  it('emits IRI members of sh:in unquoted', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{
          id: 'g1', label: 'G', order: 0,
          fields: [field({ widgetId: 'EnumSelectEditor', nodeKind: 'sh:IRI', datatype: null, inValues: [
            { value: 'ex:Public', kind: 'iri' }, { value: 'ex:Private', kind: 'iri' },
          ] })],
        }],
      }),
    );
    expect(out).toContain('sh:in ( ex:Public ex:Private )');
  });

  it('emits dct:description for the schema', () => {
    const out = generateShacl(baseSchema({ schemaDescription: 'A test schema.' }));
    expect(out).toContain('dct:description "A test schema."');
  });

  it('emits value-range bounds', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{
          id: 'g1', label: 'G', order: 0,
          fields: [field({ widgetId: 'NumberFieldEditor', datatype: 'xsd:integer', minInclusive: '1900', maxExclusive: '2100' })],
        }],
      }),
    );
    expect(out).toContain('sh:minInclusive 1900');
    expect(out).toContain('sh:maxExclusive 2100');
  });

  it('emits date range bounds as typed literals', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{
          id: 'g1', label: 'G', order: 0,
          fields: [field({ widgetId: 'DatePickerEditor', datatype: 'xsd:date', minInclusive: '2020-01-01' })],
        }],
      }),
    );
    expect(out).toContain('sh:minInclusive "2020-01-01"^^xsd:date');
  });

  it('emits sh:order', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ order: 3 })] }] }),
    );
    expect(out).toContain('sh:order 3');
  });

  it('emits dash:editor', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'G', order: 0, fields: [field()] }] }),
    );
    expect(out).toContain('dash:editor dash:TextFieldEditor');
  });

  it('emits sh:group referencing the correct group IRI', () => {
    const out = generateShacl(
      baseSchema({ groups: [{ id: 'g1', label: 'General', order: 0, fields: [field()] }] }),
    );
    expect(out).toContain('sh:group :GeneralGroup');
  });

  it('correctly terminates the last property with a dot', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field(), field({ id: 'f2', path: ':b', order: 1 })] }],
    });
    const out = generateShacl(schema);
    // Last sh:property block must close with `] .`
    expect(out).toMatch(/\] \./);
    // Second-to-last must close with `] ;`
    expect(out).toMatch(/\] ;/);
  });

  it('escapes double-quotes in string values', () => {
    const out = generateShacl(
      baseSchema({
        groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ name: 'Say "hello"' })] }],
      }),
    );
    expect(out).toContain('sh:name "Say \\"hello\\""');
  });
});

// ── Nested shapes output ───────────────────────────────────────────────────────

describe('generateShacl – nested shapes', () => {
  it('appends nested shape blocks after the main shape', () => {
    const schema = baseSchema({
      nestedShapes: [{
        id: 'ns1',
        iri: ':AgentShape',
        targetClass: ':Agent',
        fields: [field({ id: 'nf1', path: ':name', name: 'Name' })],
      }],
    });
    const out = generateShacl(schema);
    expect(out).toContain(':AgentShape');
    expect(out).toContain('sh:targetClass :Agent');
    expect(out).toContain('sh:path :name');
  });

  it('emits the main shape before nested shapes', () => {
    const schema = baseSchema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field()] }],
      nestedShapes: [{ id: 'ns1', iri: ':NS', targetClass: '', fields: [] }],
    });
    const out = generateShacl(schema);
    const mainIdx = out.indexOf(':TestShape');
    const nestedIdx = out.indexOf(':NS');
    expect(mainIdx).toBeLessThan(nestedIdx);
  });

  it('emits sh:targetClass on nested shapes when set', () => {
    const schema = baseSchema({
      nestedShapes: [{ id: 'ns1', iri: ':Nest', targetClass: 'foaf:Person', fields: [] }],
    });
    const out = generateShacl(schema);
    expect(out).toContain('sh:targetClass foaf:Person');
  });

  it('handles nested shapes with no fields', () => {
    const schema = baseSchema({
      nestedShapes: [{ id: 'ns1', iri: ':Empty', targetClass: '', fields: [] }],
    });
    const out = generateShacl(schema);
    // Must close correctly with a dot, not a semicolon
    const nsIdx = out.indexOf(':Empty');
    const nsBlock = out.slice(nsIdx);
    expect(nsBlock.slice(0, nsBlock.indexOf('\n\n') + 1 || undefined)).toMatch(/\.$\s*$/m);
  });

  it('emits multiple nested shapes', () => {
    const schema = baseSchema({
      nestedShapes: [
        { id: 'ns1', iri: ':A', targetClass: '', fields: [] },
        { id: 'ns2', iri: ':B', targetClass: '', fields: [] },
      ],
    });
    const out = generateShacl(schema);
    expect(out).toContain(':A');
    expect(out).toContain(':B');
  });
});
