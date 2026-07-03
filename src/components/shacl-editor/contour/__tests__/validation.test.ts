import { describe, it, expect } from 'vitest';
import { validateSchema } from '../validation';
import type { Schema } from '../types';

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

function schema(overrides: Partial<Schema> = {}): Schema {
  return {
    schemaName: 'Test',
    schemaDescription: '',
    shapeIri: ':Shape',
    targetClass: 'dct:Thing',
    prefixes: [
      { prefix: 'dct', uri: 'http://purl.org/dc/terms/' },
      { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' },
      { prefix: '', uri: 'http://example.org/' },
    ],
    groups: [{ id: 'g1', label: 'General', order: 0, fields: [field()] }],
    nestedShapes: [],
    ...overrides,
  };
}

const messages = (s: Schema) => validateSchema(s).map((i) => i.message);

describe('validateSchema', () => {
  it('reports no issues for a well-formed schema', () => {
    expect(validateSchema(schema())).toHaveLength(0);
  });

  it('flags an empty property path as an error', () => {
    const issues = validateSchema(schema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ path: '' })] }],
    }));
    expect(issues.some((i) => i.severity === 'error' && /no path/.test(i.message))).toBe(true);
  });

  it('flags an undeclared prefix on a path', () => {
    const issues = validateSchema(schema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ path: 'foaf:name' })] }],
    }));
    expect(issues.some((i) => /undeclared prefix "foaf:"/.test(i.message))).toBe(true);
  });

  it('flags a DetailsEditor with a dangling sh:node', () => {
    const issues = validateSchema(schema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ widgetId: 'DetailsEditor', path: 'dct:relation', node: ':Missing' })] }],
    }));
    expect(issues.some((i) => i.severity === 'error' && /missing nested shape/.test(i.message))).toBe(true);
  });

  it('flags a missing target class', () => {
    expect(messages(schema({ targetClass: '' })).some((m) => /target class/.test(m))).toBe(true);
  });

  it('flags duplicate paths within a group', () => {
    const issues = validateSchema(schema({
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ id: 'a', path: 'dct:x' }), field({ id: 'b', path: 'dct:x' })] }],
    }));
    expect(issues.some((i) => /Duplicate path/.test(i.message))).toBe(true);
  });

  it('sorts errors before warnings', () => {
    const issues = validateSchema(schema({
      targetClass: '',
      groups: [{ id: 'g1', label: 'G', order: 0, fields: [field({ path: '' })] }],
    }));
    expect(issues[0]!.severity).toBe('error');
  });
});
