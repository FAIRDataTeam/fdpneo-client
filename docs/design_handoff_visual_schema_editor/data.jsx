/* global React */

// All DASH form widgets from https://datashapes.org/forms.html
window.WIDGETS = [
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
    desc: 'HTML / formatted text',
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
    desc: 'Search by class',
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
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:string', inValues: ['Option A', 'Option B'] },
  },
  {
    id: 'BooleanSelectEditor',
    name: 'Boolean',
    desc: 'Yes / no toggle',
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
    editor: 'dash:TextFieldEditor',
    icon: '№',
    defaults: { nodeKind: 'sh:Literal', datatype: 'xsd:integer' },
  },
];

window.WIDGET_BY_ID = Object.fromEntries(window.WIDGETS.map((w) => [w.id, w]));

window.CATEGORIES = [...new Set(window.WIDGETS.map((w) => w.category))];

window.DATATYPES = [
  'xsd:string', 'xsd:boolean', 'xsd:integer', 'xsd:decimal', 'xsd:double',
  'xsd:date', 'xsd:dateTime', 'xsd:time', 'xsd:anyURI', 'rdf:HTML', 'rdf:langString',
];

window.NODE_KINDS = [
  'sh:Literal', 'sh:IRI', 'sh:BlankNode', 'sh:BlankNodeOrIRI', 'sh:BlankNodeOrLiteral', 'sh:IRIOrLiteral',
];

window.DEFAULT_PREFIXES = [
  { prefix: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
  { prefix: 'dash', uri: 'http://datashapes.org/dash#' },
  { prefix: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
  { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
  { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' },
  { prefix: 'dcat', uri: 'http://www.w3.org/ns/dcat#' },
  { prefix: 'dct', uri: 'http://purl.org/dc/terms/' },
  { prefix: 'foaf', uri: 'http://xmlns.com/foaf/0.1/' },
];

// Seed example: a "Dataset" shape with a couple of fields, mirroring DCAT
window.SEED_SCHEMA = {
  schemaName: 'Dataset',
  schemaDescription: 'A DCAT-style dataset metadata schema',
  shapeIri: ':DatasetShape',
  targetClass: 'dcat:Dataset',
  prefixes: window.DEFAULT_PREFIXES.slice(),
  groups: [
    {
      id: 'g1',
      label: 'General information',
      order: 0,
      fields: [
        {
          id: 'f1', widgetId: 'TextFieldEditor', name: 'Title',
          description: 'A human-readable title for the dataset',
          path: 'dct:title', datatype: 'xsd:string', nodeKind: 'sh:Literal',
          minCount: 1, maxCount: 1, order: 0,
        },
        {
          id: 'f2', widgetId: 'TextAreaEditor', name: 'Description',
          description: 'A free-text account of the dataset',
          path: 'dct:description', datatype: 'xsd:string', nodeKind: 'sh:Literal',
          minCount: 1, maxCount: null, order: 1,
        },
        {
          id: 'f3', widgetId: 'DatePickerEditor', name: 'Issued',
          description: 'Date of formal issuance',
          path: 'dct:issued', datatype: 'xsd:date', nodeKind: 'sh:Literal',
          minCount: 0, maxCount: 1, order: 2,
        },
      ],
    },
    {
      id: 'g2',
      label: 'Provenance',
      order: 1,
      fields: [
        {
          id: 'f4', widgetId: 'AutoCompleteEditor', name: 'Publisher',
          description: 'The entity responsible for making the dataset available',
          path: 'dct:publisher', nodeKind: 'sh:IRI', class: 'foaf:Agent',
          minCount: 1, maxCount: 1, order: 0,
        },
        {
          id: 'f5', widgetId: 'EnumSelectEditor', name: 'Access rights',
          description: 'Information about who can access the resource',
          path: 'dct:accessRights', datatype: 'xsd:string', nodeKind: 'sh:Literal',
          inValues: ['public', 'restricted', 'private'],
          minCount: 1, maxCount: 1, order: 1,
        },
      ],
    },
  ],
};
