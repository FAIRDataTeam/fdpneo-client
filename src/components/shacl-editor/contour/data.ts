// Adapted from Contour (sibling repo) @ 4117ff2 — SHACL engine ported into the FDP client.
// First-class client code (held to the full strict config); Contour remains a separate project.
import type { Field, InValue, Prefix, Schema, Widget } from './types';

// Concise constructor for literal sh:in members in the static catalogue/examples.
const lit = (value: string): InValue => ({ value, kind: 'literal' });

// All DASH form widgets from https://datashapes.org/forms.html
export const WIDGETS: Widget[] = [
  {
    id: 'TextFieldEditor',
    name: 'Text field',
    desc: 'Single-line text',
    category: 'Text',
    editor: 'dash:TextFieldEditor',
    icon: 'T',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:string' },
  },
  {
    id: 'TextAreaEditor',
    name: 'Text area',
    desc: 'Multi-line text',
    category: 'Text',
    editor: 'dash:TextAreaEditor',
    icon: '¶',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:string' },
  },
  {
    id: 'RichTextEditor',
    name: 'Rich text',
    desc: 'Formatted text with language tag',
    category: 'Text',
    editor: 'dash:RichTextEditor',
    icon: 'B',
    defaults: { nodeKind: 'sh:Literal', datatype: 'rdf:HTML' },
  },
  {
    id: 'URIEditor',
    name: 'URI',
    desc: 'IRI / link input',
    category: 'References',
    editor: 'dash:URIEditor',
    icon: '↗',
    defaults: { nodeKind: 'sh:IRI' },
  },
  {
    id: 'AutoCompleteEditor',
    name: 'Auto-complete',
    desc: 'Instances lookup by label',
    category: 'References',
    editor: 'dash:AutoCompleteEditor',
    icon: '⌕',
    defaults: { nodeKind: 'sh:IRI', class: 'foaf:Agent' },
  },
  {
    id: 'InstancesSelectEditor',
    name: 'Instances select',
    desc: 'Drop-down of instances',
    category: 'References',
    editor: 'dash:InstancesSelectEditor',
    icon: '▼',
    defaults: { nodeKind: 'sh:IRI' },
  },
  {
    id: 'DetailsEditor',
    name: 'Details (nested)',
    desc: 'Embedded sub-form',
    category: 'References',
    editor: 'dash:DetailsEditor',
    icon: '▢',
    defaults: { nodeKind: 'sh:BlankNodeOrIRI' },
  },
  {
    id: 'EnumSelectEditor',
    name: 'Enumeration',
    desc: 'Choice from fixed list',
    category: 'Choice',
    editor: 'dash:EnumSelectEditor',
    icon: '◉',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:string', inValues: [lit('Option A'), lit('Option B')] },
  },
  {
    id: 'BooleanSelectEditor',
    name: 'Boolean',
    desc: 'true / false select',
    category: 'Choice',
    editor: 'dash:BooleanSelectEditor',
    icon: '☑',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:boolean' },
  },
  {
    id: 'DatePickerEditor',
    name: 'Date picker',
    desc: 'Calendar selector',
    category: 'Date & number',
    editor: 'dash:DatePickerEditor',
    icon: '◫',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:date' },
  },
  {
    id: 'DateTimePickerEditor',
    name: 'Date & time',
    desc: 'Date with time',
    category: 'Date & number',
    editor: 'dash:DateTimePickerEditor',
    icon: '⏱',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:dateTime' },
  },
  {
    id: 'NumberFieldEditor',
    name: 'Number',
    desc: 'Numeric field',
    category: 'Date & number',
    editor: 'dash:NumberFieldEditor',
    icon: '№',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:integer' },
  },
];

export const WIDGET_BY_ID: Record<string, Widget> = Object.fromEntries(
  WIDGETS.map((w) => [w.id, w]),
);

export const CATEGORIES: string[] = [...new Set(WIDGETS.map((w) => w.category))];

export const DATATYPES: string[] = [
  'xsd:string',
  'xsd:boolean',
  'xsd:integer',
  'xsd:decimal',
  'xsd:double',
  'xsd:date',
  'xsd:dateTime',
  'xsd:time',
  'xsd:anyURI',
  'rdf:HTML',
  'rdf:langString',
];

// Curated common predicates/classes for visual-editor autocomplete (native
// <datalist>). Not exhaustive — just the terms data stewards reach for most.
export const VOCAB_TERMS: string[] = [
  'dct:title', 'dct:description', 'dct:identifier', 'dct:issued', 'dct:modified',
  'dct:publisher', 'dct:creator', 'dct:license', 'dct:rights', 'dct:accessRights',
  'dct:conformsTo', 'dct:isPartOf', 'dct:hasPart', 'dct:relation', 'dct:subject',
  'dct:type', 'dct:format', 'dct:language', 'dct:spatial', 'dct:temporal',
  'dcat:keyword', 'dcat:theme', 'dcat:contactPoint', 'dcat:distribution',
  'dcat:landingPage', 'dcat:accessURL', 'dcat:downloadURL', 'dcat:mediaType', 'dcat:byteSize',
  'foaf:name', 'foaf:mbox', 'foaf:homepage', 'foaf:img',
  'skos:prefLabel', 'skos:altLabel', 'skos:definition', 'skos:broader', 'skos:narrower', 'skos:related', 'skos:notation',
  'rdfs:label', 'rdfs:comment', 'vcard:fn', 'vcard:hasEmail',
];
export const VOCAB_CLASSES: string[] = [
  'dcat:Dataset', 'dcat:Catalog', 'dcat:Distribution', 'dcat:DataService',
  'foaf:Agent', 'foaf:Person', 'foaf:Organization',
  'skos:Concept', 'skos:ConceptScheme', 'vcard:Kind',
  'dct:Standard', 'dct:LicenseDocument', 'dct:Location', 'dct:PeriodOfTime',
];

export const NODE_KINDS: string[] = [
  'sh:Literal',
  'sh:IRI',
  'sh:BlankNode',
  'sh:BlankNodeOrIRI',
  'sh:BlankNodeOrLiteral',
  'sh:IRIOrLiteral',
];

export const DEFAULT_PREFIXES: Prefix[] = [
  { prefix: '', uri: 'http://fairdatapoint.org/' },
  { prefix: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
  { prefix: 'dash', uri: 'http://datashapes.org/dash#' },
  { prefix: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
  { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
  { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' },
  { prefix: 'dcat', uri: 'http://www.w3.org/ns/dcat#' },
  { prefix: 'dct', uri: 'http://purl.org/dc/terms/' },
  { prefix: 'foaf', uri: 'http://xmlns.com/foaf/0.1/' },
];

// A fresh, empty schema — the starting point for a new metadata schema.
// Keeps the common vocabularies declared so the generated SHACL is valid.
export function blankSchema(): Schema {
  return {
    schemaName: '',
    schemaDescription: '',
    shapeIri: ':Shape',
    targetClass: '',
    prefixes: DEFAULT_PREFIXES.slice(),
    groups: [],
    nestedShapes: [],
  };
}

// Concise field factory for the built-in examples — fills the nullable
// defaults so each example only specifies the props it cares about.
function f(
  p: Partial<Field> & { id: string; widgetId: string; name: string; path: string; order: number },
): Field {
  return {
    description: '',
    nodeKind: null,
    datatype: null,
    class: null,
    node: null,
    minCount: null,
    maxCount: null,
    minLength: null,
    maxLength: null,
    pattern: '',
    defaultValue: '',
    inValues: null,
    ...p,
  };
}

const PREFIX_SKOS: Prefix = { prefix: 'skos', uri: 'http://www.w3.org/2004/02/skos/core#' };
const PREFIX_VCARD: Prefix = { prefix: 'vcard', uri: 'http://www.w3.org/2006/vcard/ns#' };

export interface SchemaExample {
  id: string;
  schema: Schema;
}

// Built-in starter templates, surfaced via the "Examples" menu. These mirror
// the schemas used in the data-steward guide.
export const EXAMPLES: SchemaExample[] = [
  {
    id: 'dataset',
    schema: {
      schemaName: 'Dataset',
      schemaDescription: 'A DCAT-style dataset metadata schema.',
      shapeIri: ':DatasetShape',
      targetClass: 'dcat:Dataset',
      prefixes: [...DEFAULT_PREFIXES, PREFIX_VCARD],
      groups: [
        {
          id: 'ds-g1',
          label: 'General information',
          order: 0,
          fields: [
            f({ id: 'ds-f1', widgetId: 'TextFieldEditor', name: 'Title', path: 'dct:title', description: 'A human-readable title for the dataset', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 1, maxCount: 1, order: 0 }),
            f({ id: 'ds-f2', widgetId: 'TextAreaEditor', name: 'Description', path: 'dct:description', description: 'A free-text account of the dataset', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 1, order: 1 }),
            f({ id: 'ds-f3', widgetId: 'DatePickerEditor', name: 'Issued', path: 'dct:issued', description: 'Date of formal issuance', nodeKind: 'sh:Literal', datatype: 'xsd:date', minCount: 0, maxCount: 1, order: 2 }),
            f({ id: 'ds-f4', widgetId: 'TextFieldEditor', name: 'Keyword', path: 'dcat:keyword', description: 'A keyword or tag describing the dataset', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 0, order: 3 }),
          ],
        },
        {
          id: 'ds-g2',
          label: 'Provenance',
          order: 1,
          fields: [
            f({ id: 'ds-f5', widgetId: 'AutoCompleteEditor', name: 'Publisher', path: 'dct:publisher', description: 'The entity responsible for making the dataset available', nodeKind: 'sh:IRI', class: 'foaf:Agent', minCount: 1, maxCount: 1, order: 0 }),
            f({ id: 'ds-f6', widgetId: 'EnumSelectEditor', name: 'Access rights', path: 'dct:accessRights', description: 'Information about who can access the resource', nodeKind: 'sh:Literal', datatype: 'xsd:string', inValues: [lit('public'), lit('restricted'), lit('private')], minCount: 1, maxCount: 1, order: 1 }),
          ],
        },
        {
          id: 'ds-g3',
          label: 'Contact',
          order: 2,
          fields: [
            f({ id: 'ds-f7', widgetId: 'DetailsEditor', name: 'Contact point', path: 'dcat:contactPoint', description: 'The person or team to contact about this dataset', nodeKind: 'sh:BlankNodeOrIRI', node: ':ContactShape', minCount: 0, maxCount: 1, order: 0 }),
          ],
        },
      ],
      nestedShapes: [
        {
          id: 'ds-ns1',
          iri: ':ContactShape',
          targetClass: 'vcard:Kind',
          fields: [
            f({ id: 'ds-nf1', widgetId: 'TextFieldEditor', name: 'Full name', path: 'vcard:fn', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 1, maxCount: 1, order: 0 }),
            f({ id: 'ds-nf2', widgetId: 'URIEditor', name: 'Email', path: 'vcard:hasEmail', nodeKind: 'sh:IRI', minCount: 0, maxCount: 1, order: 1 }),
          ],
        },
      ],
    },
  },
  {
    id: 'agent',
    schema: {
      schemaName: 'Agent',
      schemaDescription: 'A FOAF agent — a person or organisation.',
      shapeIri: ':AgentShape',
      targetClass: 'foaf:Agent',
      prefixes: DEFAULT_PREFIXES.slice(),
      groups: [
        {
          id: 'ag-g1',
          label: 'Agent',
          order: 0,
          fields: [
            f({ id: 'ag-f1', widgetId: 'TextFieldEditor', name: 'Name', path: 'foaf:name', description: 'Full name of the person or organisation', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 1, maxCount: 1, order: 0 }),
            f({ id: 'ag-f2', widgetId: 'URIEditor', name: 'Email', path: 'foaf:mbox', description: 'A mailbox, as a mailto: IRI', nodeKind: 'sh:IRI', minCount: 0, order: 1 }),
            f({ id: 'ag-f3', widgetId: 'URIEditor', name: 'Homepage', path: 'foaf:homepage', nodeKind: 'sh:IRI', minCount: 0, maxCount: 1, order: 2 }),
            f({ id: 'ag-f4', widgetId: 'URIEditor', name: 'Image', path: 'foaf:img', nodeKind: 'sh:IRI', minCount: 0, maxCount: 1, order: 3 }),
          ],
        },
      ],
      nestedShapes: [],
    },
  },
  {
    id: 'concept',
    schema: {
      schemaName: 'Concept',
      schemaDescription: 'A SKOS concept for a controlled vocabulary or ontology.',
      shapeIri: ':ConceptShape',
      targetClass: 'skos:Concept',
      prefixes: [...DEFAULT_PREFIXES, PREFIX_SKOS],
      groups: [
        {
          id: 'sk-g1',
          label: 'Labels',
          order: 0,
          fields: [
            f({ id: 'sk-f1', widgetId: 'TextFieldEditor', name: 'Preferred label', path: 'skos:prefLabel', description: 'The preferred lexical label for the concept', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 1, maxCount: 1, order: 0 }),
            f({ id: 'sk-f2', widgetId: 'TextFieldEditor', name: 'Alternative label', path: 'skos:altLabel', description: 'Synonyms or alternative labels', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 0, order: 1 }),
            f({ id: 'sk-f3', widgetId: 'TextAreaEditor', name: 'Definition', path: 'skos:definition', description: 'A complete explanation of the concept', nodeKind: 'sh:Literal', datatype: 'xsd:string', minCount: 0, maxCount: 1, order: 2 }),
          ],
        },
        {
          id: 'sk-g2',
          label: 'Relations',
          order: 1,
          fields: [
            f({ id: 'sk-f4', widgetId: 'AutoCompleteEditor', name: 'Broader', path: 'skos:broader', description: 'A broader (more general) concept', nodeKind: 'sh:IRI', class: 'skos:Concept', minCount: 0, order: 0 }),
            f({ id: 'sk-f5', widgetId: 'AutoCompleteEditor', name: 'Related', path: 'skos:related', description: 'An associated concept', nodeKind: 'sh:IRI', class: 'skos:Concept', minCount: 0, order: 1 }),
          ],
        },
      ],
      nestedShapes: [],
    },
  },
];

// IDs are client-side only and never persisted, so the ~2B collision space of
// 6 base-36 chars is safe in practice.
export function newId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}