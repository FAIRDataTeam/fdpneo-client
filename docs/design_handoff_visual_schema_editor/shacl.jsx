/* global React */
// SHACL turtle generator + simple syntax highlighter

function compactNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function quoteString(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function fieldToProps(field) {
  const w = window.WIDGET_BY_ID[field.widgetId];
  const lines = [];
  lines.push(`sh:path ${field.path || ':unknownPath'}`);
  if (field.name) lines.push(`sh:name ${quoteString(field.name)}`);
  if (field.description) lines.push(`sh:description ${quoteString(field.description)}`);
  if (field.nodeKind) lines.push(`sh:nodeKind ${field.nodeKind}`);
  if (field.datatype) lines.push(`sh:datatype ${field.datatype}`);
  if (field.class) lines.push(`sh:class ${field.class}`);
  const mn = compactNumeric(field.minCount); if (mn !== null) lines.push(`sh:minCount ${mn}`);
  const mx = compactNumeric(field.maxCount); if (mx !== null) lines.push(`sh:maxCount ${mx}`);
  const mnl = compactNumeric(field.minLength); if (mnl !== null) lines.push(`sh:minLength ${mnl}`);
  const mxl = compactNumeric(field.maxLength); if (mxl !== null) lines.push(`sh:maxLength ${mxl}`);
  if (field.pattern) lines.push(`sh:pattern ${quoteString(field.pattern)}`);
  if (field.defaultValue) lines.push(`sh:defaultValue ${quoteString(field.defaultValue)}`);
  if (Array.isArray(field.inValues) && field.inValues.length > 0) {
    const items = field.inValues.map((v) => quoteString(v)).join(' ');
    lines.push(`sh:in ( ${items} )`);
  }
  if (typeof field.order === 'number') lines.push(`sh:order ${field.order}`);
  // editor (DASH)
  if (w && w.editor) lines.push(`dash:editor ${w.editor}`);
  // group reference (filled in by caller)
  return lines;
}

function generateShacl(schema) {
  const out = [];
  // prefixes
  for (const p of (schema.prefixes || [])) {
    out.push(`@prefix ${p.prefix}: <${p.uri}> .`);
  }
  out.push('@prefix : <http://fairdatapoint.org/> .');
  out.push('');

  // groups
  const groups = (schema.groups || []).slice().sort((a, b) => a.order - b.order);
  for (const g of groups) {
    const gIri = `:${(g.label || 'group').replace(/\s+/g, '')}Group`;
    out.push(`${gIri}`);
    out.push(`  a sh:PropertyGroup ;`);
    out.push(`  rdfs:label ${quoteString(g.label || 'Group')} ;`);
    out.push(`  sh:order ${g.order} .`);
    out.push('');
  }

  // node shape
  out.push(`${schema.shapeIri || ':Shape'}`);
  out.push(`  a sh:NodeShape ;`);
  if (schema.schemaName) {
    out.push(`  rdfs:label ${quoteString(schema.schemaName)} ;`);
  }
  if (schema.schemaDescription) {
    out.push(`  rdfs:comment ${quoteString(schema.schemaDescription)} ;`);
  }
  if (schema.targetClass) {
    out.push(`  sh:targetClass ${schema.targetClass} ;`);
  }

  const allFields = [];
  groups.forEach((g) => {
    (g.fields || []).forEach((f) => allFields.push({ field: f, group: g }));
  });

  if (allFields.length === 0) {
    // close shape with just a dot if no properties
    out[out.length - 1] = out[out.length - 1].replace(/;$/, '.');
  } else {
    allFields.forEach(({ field, group }, idx) => {
      const isLast = idx === allFields.length - 1;
      const lines = fieldToProps(field);
      if (group) {
        const gIri = `:${(group.label || 'group').replace(/\s+/g, '')}Group`;
        lines.push(`sh:group ${gIri}`);
      }
      out.push(`  sh:property [`);
      lines.forEach((l, i) => {
        const terminator = i === lines.length - 1 ? '' : ' ;';
        out.push(`    ${l}${terminator}`);
      });
      out.push(`  ]${isLast ? ' .' : ' ;'}`);
    });
  }

  return out.join('\n');
}

// Light syntax highlighter — escape HTML, then wrap tokens.
function highlightTurtle(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n');
  return lines.map((line) => {
    // comments
    const cIdx = line.indexOf('#');
    let pre = line;
    let comment = '';
    if (cIdx >= 0 && !line.slice(0, cIdx).match(/"/)) {
      pre = line.slice(0, cIdx);
      comment = `<span class="tok-comment">${esc(line.slice(cIdx))}</span>`;
    }
    // strings
    pre = esc(pre).replace(/&quot;([^&]*?)&quot;/g, '<span class="tok-str">"$1"</span>');
    // numbers
    pre = pre.replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
    // prefix decl
    pre = pre.replace(/(@prefix)\s+([\w-]*):/g, '<span class="tok-prefix">$1</span> <span class="tok-subj">$2:</span>');
    // sh:, dash:, dct: etc — predicates
    pre = pre.replace(/\b(sh|dash|rdfs|rdf|dcat|dct|foaf|xsd):([A-Za-z][\w-]*)/g, (m, ns, term) => {
      const cls = (ns === 'sh' || ns === 'dash') ? 'tok-pred' : 'tok-class';
      return `<span class="${cls}">${ns}:${term}</span>`;
    });
    return pre + comment;
  }).join('\n');
}

window.SchemaGen = { generateShacl, highlightTurtle };
