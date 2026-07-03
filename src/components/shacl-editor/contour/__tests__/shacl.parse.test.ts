import { describe, it, expect } from 'vitest';
import { parseShacl } from '../shacl';

// ── Helpers ────────────────────────────────────────────────────────────────────

const BASE_PREFIXES = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix : <http://example.org/> .
`;

function minimal(body: string) {
  return `${BASE_PREFIXES}
:TestShape a sh:NodeShape ;
  sh:targetClass :Test ;
  ${body} .`;
}

// ── Basic parsing ──────────────────────────────────────────────────────────────

describe('parseShacl – basic structure', () => {
  it('returns null schema when no NodeShape is found', () => {
    const result = parseShacl('@prefix sh: <http://www.w3.org/ns/shacl#> .');
    expect(result.schema).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('parses shape IRI and targetClass', () => {
    const ttl = `${BASE_PREFIXES}
:DatasetShape a sh:NodeShape ;
  sh:targetClass :Dataset .`;
    const { schema } = parseShacl(ttl);
    expect(schema).not.toBeNull();
    expect(schema!.shapeIri).toBe(':DatasetShape');
    expect(schema!.targetClass).toBe(':Dataset');
  });

  it('parses rdfs:label into schemaName', () => {
    const ttl = `${BASE_PREFIXES}
:Shape a sh:NodeShape ;
  rdfs:label "My Schema" ;
  sh:targetClass :Thing .`;
    const { schema } = parseShacl(ttl);
    expect(schema!.schemaName).toBe('My Schema');
  });

  it('parses all @prefix declarations', () => {
    const ttl = `${BASE_PREFIXES}
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
:S a sh:NodeShape .`;
    const { schema } = parseShacl(ttl);
    const prefixMap = Object.fromEntries(schema!.prefixes.map((p) => [p.prefix, p.uri]));
    expect(prefixMap['sh']).toBe('http://www.w3.org/ns/shacl#');
    expect(prefixMap['foaf']).toBe('http://xmlns.com/foaf/0.1/');
    expect(prefixMap['']).toBe('http://example.org/'); // blank prefix
  });

  it('parses empty prefix (`:`) correctly', () => {
    const ttl = `@prefix : <http://fairdatapoint.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
:Shape a sh:NodeShape .`;
    const { schema } = parseShacl(ttl);
    const blank = schema!.prefixes.find((p) => p.prefix === '');
    expect(blank).toBeDefined();
    expect(blank!.uri).toBe('http://fairdatapoint.org/');
  });
});

// ── Property blocks ────────────────────────────────────────────────────────────

describe('parseShacl – sh:property blocks', () => {
  it('parses a single property block', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      sh:name "Title" ;
      sh:minCount 1 ;
      dash:editor dash:TextFieldEditor
    ]`);
    const { schema } = parseShacl(ttl);
    expect(schema).not.toBeNull();
    const fields = schema!.groups.flatMap((g) => g.fields);
    expect(fields).toHaveLength(1);
    const f = fields[0]!;
    expect(f.path).toBe('dct:title');
    expect(f.name).toBe('Title');
    expect(f.minCount).toBe(1);
    expect(f.widgetId).toBe('TextFieldEditor');
  });

  it('parses multiple semicolon-separated sh:property blocks', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      dash:editor dash:TextFieldEditor
    ] ;
    sh:property [
      sh:path dct:description ;
      dash:editor dash:TextAreaEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const fields = schema!.groups.flatMap((g) => g.fields);
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.path)).toEqual(['dct:title', 'dct:description']);
  });

  it('parses comma-separated sh:property blocks', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      dash:editor dash:TextFieldEditor
    ], [
      sh:path dct:date ;
      dash:editor dash:DatePickerEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const fields = schema!.groups.flatMap((g) => g.fields);
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.path)).toEqual(['dct:title', 'dct:date']);
  });

  it('returns an error when sh:path is missing', () => {
    const ttl = minimal(`sh:property [
      sh:name "Orphan"
    ]`);
    const { schema, error } = parseShacl(ttl);
    expect(schema).toBeNull();
    expect(error).toMatch(/sh:path/i);
  });

  it('returns an error for unclosed bracket', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      dash:editor dash:TextFieldEditor`);
    const { schema, error } = parseShacl(ttl);
    expect(schema).toBeNull();
    // N3 reports its own syntax-error message; we just surface it.
    expect(error).toBeTruthy();
  });

  it('parses all field constraint properties', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      sh:name "Title" ;
      sh:description "A title" ;
      sh:nodeKind sh:Literal ;
      sh:datatype xsd:string ;
      sh:minCount 1 ;
      sh:maxCount 1 ;
      sh:minLength 2 ;
      sh:maxLength 100 ;
      sh:pattern "^[A-Z]" ;
      sh:defaultValue "Untitled" ;
      sh:order 5 ;
      dash:editor dash:TextFieldEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.name).toBe('Title');
    expect(f.description).toBe('A title');
    expect(f.nodeKind).toBe('sh:Literal');
    expect(f.datatype).toBe('xsd:string');
    expect(f.minCount).toBe(1);
    expect(f.maxCount).toBe(1);
    expect(f.minLength).toBe(2);
    expect(f.maxLength).toBe(100);
    expect(f.pattern).toBe('^[A-Z]');
    expect(f.defaultValue).toBe('Untitled');
    expect(f.order).toBe(5);
  });

  it('parses sh:in list of literal values', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:rights ;
      sh:in ( "public" "restricted" "private" ) ;
      dash:editor dash:EnumSelectEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.inValues).toEqual([
      { value: 'public', kind: 'literal' },
      { value: 'restricted', kind: 'literal' },
      { value: 'private', kind: 'literal' },
    ]);
  });

  it('parses sh:in list of IRI values as IRIs', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:rights ;
      sh:in ( :Public :Restricted ) ;
      dash:editor dash:EnumSelectEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.inValues).toEqual([
      { value: ':Public', kind: 'iri' },
      { value: ':Restricted', kind: 'iri' },
    ]);
  });

  it('parses value-range bounds', () => {
    const ttl = minimal(`sh:property [
      sh:path :year ;
      sh:minInclusive 1900 ;
      sh:maxInclusive "2020-12-31"^^xsd:date ;
      dash:editor dash:NumberFieldEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.minInclusive).toBe('1900');
    expect(f.maxInclusive).toBe('2020-12-31');
  });

  it('falls back to TextFieldEditor when dash:editor is absent', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title
    ]`);
    const { schema } = parseShacl(ttl);
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.widgetId).toBe('TextFieldEditor');
  });
});

// ── PropertyGroups ─────────────────────────────────────────────────────────────

describe('parseShacl – sh:PropertyGroup', () => {
  it('assigns fields to named groups', () => {
    const ttl = `${BASE_PREFIXES}
:BasicGroup a sh:PropertyGroup ; rdfs:label "Basic" ; sh:order 0 .
:Shape a sh:NodeShape ;
  sh:property [
    sh:path dct:title ;
    sh:group :BasicGroup ;
    dash:editor dash:TextFieldEditor
  ] .`;
    const { schema } = parseShacl(ttl);
    expect(schema!.groups).toHaveLength(1);
    expect(schema!.groups[0]!.label).toBe('Basic');
    expect(schema!.groups[0]!.fields).toHaveLength(1);
  });

  it('creates a fallback group for ungrouped fields', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      dash:editor dash:TextFieldEditor
    ]`);
    const { schema } = parseShacl(ttl);
    expect(schema!.groups).toHaveLength(1);
    expect(schema!.groups[0]!.label).toBe('General');
  });

  it('respects sh:order on PropertyGroups', () => {
    const ttl = `${BASE_PREFIXES}
:BGroup a sh:PropertyGroup ; rdfs:label "B" ; sh:order 1 .
:AGroup a sh:PropertyGroup ; rdfs:label "A" ; sh:order 0 .
:Shape a sh:NodeShape ;
  sh:property [ sh:path :b ; sh:group :BGroup ; dash:editor dash:TextFieldEditor ] ;
  sh:property [ sh:path :a ; sh:group :AGroup ; dash:editor dash:TextFieldEditor ] .`;
    const { schema } = parseShacl(ttl);
    const orders = schema!.groups.map((g) => g.order);
    expect(orders).toContain(0);
    expect(orders).toContain(1);
  });
});

// ── Comment stripping ──────────────────────────────────────────────────────────

describe('parseShacl – comment handling', () => {
  it('ignores # comments on their own line', () => {
    const ttl = `${BASE_PREFIXES}
# This is a comment
:Shape a sh:NodeShape ;
  sh:targetClass :T .`;
    const { schema } = parseShacl(ttl);
    expect(schema).not.toBeNull();
  });

  it('ignores inline comments after statements', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ; # the title
      dash:editor dash:TextFieldEditor # editor
    ]`);
    const { schema } = parseShacl(ttl);
    const fields = schema!.groups.flatMap((g) => g.fields);
    expect(fields).toHaveLength(1);
  });

  it('preserves # inside string literals', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      sh:name "Title # not a comment" ;
      dash:editor dash:TextFieldEditor
    ]`);
    const { schema } = parseShacl(ttl);
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.name).toBe('Title # not a comment');
  });

  it('handles # inside IRI angle brackets (e.g. XMLSchema#string)', () => {
    const ttl = minimal(`sh:property [
      sh:path dct:title ;
      sh:datatype <http://www.w3.org/2001/XMLSchema#string> ;
      dash:editor dash:TextFieldEditor
    ]`);
    const { schema, error } = parseShacl(ttl);
    expect(error).toBeNull();
    const f = schema!.groups.flatMap((g) => g.fields)[0]!;
    // The full IRI is compacted to its canonical CURIE (xsd is declared).
    expect(f.datatype).toBe('xsd:string');
  });
});

// ── Non-standard prefix aliases ────────────────────────────────────────────────

describe('parseShacl – prefix alias normalization', () => {
  it('accepts `shacl:` as an alias for the SHACL namespace', () => {
    const ttl = `@prefix shacl: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix : <http://example.org/> .
:Shape a shacl:NodeShape ;
  shacl:targetClass :Thing ;
  shacl:property [
    shacl:path :name ;
    dash:editor dash:TextFieldEditor
  ] .`;
    const { schema, error } = parseShacl(ttl);
    expect(error).toBeNull();
    expect(schema!.targetClass).toBe(':Thing');
    expect(schema!.groups.flatMap((g) => g.fields)).toHaveLength(1);
  });

  it('accepts a custom `dashacl:` alias for the DASH namespace', () => {
    const ttl = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dashacl: <http://datashapes.org/dash#> .
@prefix : <http://example.org/> .
:Shape a sh:NodeShape ;
  sh:property [
    sh:path :color ;
    dashacl:editor dashacl:EnumSelectEditor
  ] .`;
    const { schema, error } = parseShacl(ttl);
    expect(error).toBeNull();
    expect(schema!.groups.flatMap((g) => g.fields)[0]!.widgetId).toBe('EnumSelectEditor');
  });

  it('handles mixed custom aliases in the same file', () => {
    const ttl = `@prefix shacl: <http://www.w3.org/ns/shacl#> .
@prefix d: <http://datashapes.org/dash#> .
@prefix label: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/> .
:G a shacl:PropertyGroup ; label:label "Group" ; shacl:order 0 .
:S a shacl:NodeShape ;
  shacl:targetClass :C ;
  shacl:property [
    shacl:path :title ;
    shacl:group :G ;
    d:editor d:TextFieldEditor
  ] .`;
    const { schema, error } = parseShacl(ttl);
    expect(error).toBeNull();
    expect(schema!.groups[0]!.label).toBe('Group');
    expect(schema!.groups[0]!.fields).toHaveLength(1);
  });
});

// ── Nested shapes ──────────────────────────────────────────────────────────────

describe('parseShacl – nested shapes (dash:DetailsEditor)', () => {
  const NESTED_TTL = `${BASE_PREFIXES}
:Shape a sh:NodeShape ;
  sh:targetClass :Dataset ;
  sh:property [
    sh:path :agent ;
    sh:node :AgentShape ;
    dash:editor dash:DetailsEditor
  ] .

:AgentShape a sh:NodeShape ;
  sh:targetClass :Agent ;
  sh:property [
    sh:path :name ;
    sh:name "Name" ;
    dash:editor dash:TextFieldEditor
  ] ;
  sh:property [
    sh:path :email ;
    sh:name "Email" ;
    dash:editor dash:TextFieldEditor
  ] .`;

  it('parses multiple NodeShape blocks as nested shapes', () => {
    const { schema } = parseShacl(NESTED_TTL);
    expect(schema!.nestedShapes).toHaveLength(1);
  });

  it('captures the nested shape IRI', () => {
    const { schema } = parseShacl(NESTED_TTL);
    expect(schema!.nestedShapes[0]!.iri).toBe(':AgentShape');
  });

  it('captures the nested shape targetClass', () => {
    const { schema } = parseShacl(NESTED_TTL);
    expect(schema!.nestedShapes[0]!.targetClass).toBe(':Agent');
  });

  it('parses nested shape fields', () => {
    const { schema } = parseShacl(NESTED_TTL);
    const fields = schema!.nestedShapes[0]!.fields;
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.path)).toEqual([':name', ':email']);
  });

  it('assigns a stable id to each nested shape', () => {
    const { schema } = parseShacl(NESTED_TTL);
    expect(schema!.nestedShapes[0]!.id).toBeTruthy();
    expect(typeof schema!.nestedShapes[0]!.id).toBe('string');
  });

  it('parses sh:node reference on the main shape property', () => {
    const { schema } = parseShacl(NESTED_TTL);
    const agentField = schema!.groups.flatMap((g) => g.fields).find((f) => f.path === ':agent');
    expect(agentField!.node).toBe(':AgentShape');
  });

  it('does not contaminate main shape fields with nested shape fields', () => {
    const { schema } = parseShacl(NESTED_TTL);
    const mainFields = schema!.groups.flatMap((g) => g.fields);
    expect(mainFields).toHaveLength(1);
    expect(mainFields[0]!.path).toBe(':agent');
  });

  it('parses multiple nested shapes', () => {
    const ttl = `${BASE_PREFIXES}
:Shape a sh:NodeShape ; sh:targetClass :D .
:NS1 a sh:NodeShape ; sh:targetClass :A ;
  sh:property [ sh:path :x ; dash:editor dash:TextFieldEditor ] .
:NS2 a sh:NodeShape ; sh:targetClass :B ;
  sh:property [ sh:path :y ; dash:editor dash:TextFieldEditor ] .`;
    const { schema } = parseShacl(ttl);
    expect(schema!.nestedShapes).toHaveLength(2);
    expect(schema!.nestedShapes.map((n) => n.iri)).toEqual([':NS1', ':NS2']);
  });
});

// ── Error reporting ────────────────────────────────────────────────────────────

describe('parseShacl – error reporting', () => {
  it('provides errorLine when sh:path is missing', () => {
    const ttl = `${BASE_PREFIXES}
:S a sh:NodeShape ;
  sh:property [ sh:name "Foo" ] .`;
    const { errorLine } = parseShacl(ttl);
    expect(errorLine).toBeTypeOf('number');
    expect(errorLine).toBeGreaterThan(0);
  });
});
