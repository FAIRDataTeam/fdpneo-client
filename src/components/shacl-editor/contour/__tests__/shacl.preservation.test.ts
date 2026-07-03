import { describe, it, expect } from 'vitest';
import { parseShacl, generateShacl, serializeSchema } from '../shacl';
import { detectSyntax } from '../rdf';

const PREFIXES = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix : <http://example.org/> .`;

// A shape exercising constructs Contour does NOT model: a shape-level predicate
// (sh:closed), a property-level predicate (sh:message), a property using sh:or,
// and an entirely separate top-level subject.
const ADVANCED = `${PREFIXES}
:S a sh:NodeShape ;
  sh:closed true ;
  sh:targetClass :Thing ;
  sh:property [
    sh:path dct:title ;
    sh:datatype xsd:string ;
    sh:message "Title is required" ;
    dash:editor dash:TextFieldEditor
  ] ;
  sh:property [
    sh:path dct:subject ;
    sh:or ( [ sh:datatype xsd:string ; sh:minLength 2 ] [ sh:nodeKind sh:IRI ] ) ;
    dash:editor dash:TextFieldEditor
  ] .

:Ontology a owl:Ontology ;
  owl:versionInfo "1.0" .`;

describe('residual preservation (F1)', () => {
  it('keeps unmodeled constructs in schema.residual', () => {
    const { schema, error } = parseShacl(ADVANCED);
    expect(error).toBeNull();
    const r = schema!.residual || '';
    expect(r).toContain('#closed');       // shape-level unknown predicate
    expect(r).toContain('#or');           // sh:or (property-level, still unmodeled)
    expect(r).toContain('versionInfo');   // unmanaged subject
  });

  it('models the now-supported constructs (sh:message) rather than preserving them', () => {
    const { schema } = parseShacl(ADVANCED);
    const r = schema!.residual || '';
    expect(r).not.toContain('#message');  // sh:message is first-class as of Phase 3
    const title = schema!.groups.flatMap((g) => g.fields).find((f) => f.path === 'dct:title');
    expect(title!.message).toBe('Title is required');
  });

  it('still models the editable parts of advanced properties', () => {
    const { schema } = parseShacl(ADVANCED);
    const fields = schema!.groups.flatMap((g) => g.fields);
    const subject = fields.find((f) => f.path === 'dct:subject'); // uses sh:or
    expect(subject).toBeTruthy();
    // It carries a stable blank-node label so its preserved triples re-link.
    expect(typeof subject!.bnode).toBe('string');
  });

  it('re-emits preserved constructs in generated Turtle', () => {
    const { schema } = parseShacl(ADVANCED);
    const out = generateShacl(schema!);
    expect(out).toContain('# ── Preserved');
    expect(out).toContain('#closed');
    expect(out).toContain('#or');
  });

  it('is stable across a full parse → generate → parse round-trip', () => {
    const first = parseShacl(ADVANCED).schema!;
    const regen = generateShacl(first);
    const second = parseShacl(regen);
    expect(second.error).toBeNull();
    const r = second.schema!.residual || '';
    expect(r).toContain('#closed');
    expect(r).toContain('#or');
    expect(r).toContain('versionInfo');
    // Editable structure is preserved too.
    expect(second.schema!.groups.flatMap((g) => g.fields).map((f) => f.path).sort())
      .toEqual(['dct:subject', 'dct:title']);
  });

  it('models a type-only sh:or but leaves a richer sh:or in residual', () => {
    const ttl = `${PREFIXES}
:S a sh:NodeShape ; sh:targetClass :Thing ;
  sh:property [ sh:path dct:a ; sh:or ( [ sh:nodeKind sh:Literal ] [ sh:nodeKind sh:IRI ] ) ; dash:editor dash:TextFieldEditor ] ;
  sh:property [ sh:path dct:b ; sh:or ( [ sh:datatype xsd:string ; sh:minLength 2 ] [ sh:nodeKind sh:IRI ] ) ; dash:editor dash:TextFieldEditor ] .`;
    const { schema } = parseShacl(ttl);
    const fields = schema!.groups.flatMap((g) => g.fields);
    const a = fields.find((f) => f.path === 'dct:a')!;
    const b = fields.find((f) => f.path === 'dct:b')!;
    expect(a.orTypes).toEqual([{ nodeKind: 'sh:Literal' }, { nodeKind: 'sh:IRI' }]); // modeled
    expect(b.orTypes).toBeUndefined();        // richer → not modeled
    expect(typeof b.bnode).toBe('string');     // preserved via residual
    expect(schema!.residual || '').toContain('#minLength');
  });

  it('a plain schema has no residual', () => {
    const ttl = `${PREFIXES}
:S a sh:NodeShape ;
  sh:targetClass :Thing ;
  sh:property [ sh:path dct:title ; sh:datatype xsd:string ; dash:editor dash:TextFieldEditor ] .`;
    const { schema } = parseShacl(ttl);
    expect(schema!.residual).toBeUndefined();
    expect(generateShacl(schema!)).not.toContain('# ── Preserved');
  });
});

describe('multi-syntax round-trip', () => {
  const base = `${PREFIXES}
:S a sh:NodeShape ;
  sh:targetClass :Thing ;
  sh:property [ sh:path dct:title ; sh:datatype xsd:string ; sh:minCount 1 ; dash:editor dash:TextFieldEditor ] .`;

  it('round-trips through TriG preserving prefixes and structure', () => {
    const schema = parseShacl(base).schema!;
    const trig = serializeSchema(schema, 'trig');
    const back = parseShacl(trig, 'trig');
    expect(back.error).toBeNull();
    expect(back.schema!.targetClass).toBe(':Thing');
    const f = back.schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.path).toBe('dct:title');
    expect(f.minCount).toBe(1);
  });

  it('round-trips through N-Triples preserving canonical-namespace tokens', () => {
    const schema = parseShacl(base).schema!;
    const nt = serializeSchema(schema, 'ntriples');
    const back = parseShacl(nt, 'ntriples');
    expect(back.error).toBeNull();
    const f = back.schema!.groups.flatMap((g) => g.fields)[0]!;
    expect(f.path).toBe('dct:title');          // dct is canonical
    expect(f.datatype).toBe('xsd:string');      // xsd is canonical
  });

  it('detects syntax from file extension', () => {
    expect(detectSyntax('schema.ttl')).toBe('turtle');
    expect(detectSyntax('schema.nt')).toBe('ntriples');
    expect(detectSyntax('schema.trig')).toBe('trig');
    expect(detectSyntax('schema.n3')).toBe('n3');
    expect(detectSyntax('unknown.xyz')).toBe('turtle');
  });
});
