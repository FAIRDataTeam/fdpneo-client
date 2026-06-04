/* global window */
// Turtle/SHACL -> schema model parser (reverse of SchemaGen.generateShacl).
// Pragmatic recursive-descent parser handling the subset of Turtle used by
// SHACL shapes: @prefix, named subjects, predicate-object lists, blank-node
// property lists ([ ... ]) and collections ( ... ).
(function () {
  const NS = {
    sh: 'http://www.w3.org/ns/shacl#',
    dash: 'http://datashapes.org/dash#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
  };

  function tokenize(input) {
    const tokens = [];
    let i = 0;
    const n = input.length;
    const isWS = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n';
    while (i < n) {
      const c = input[i];
      if (isWS(c)) { i++; continue; }
      if (c === '#') { while (i < n && input[i] !== '\n') i++; continue; }
      if (c === '<') {
        let j = i + 1;
        while (j < n && input[j] !== '>') j++;
        tokens.push({ k: 'iri', v: input.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
      if (c === '"' || c === "'") {
        let v = '';
        const triple = input.slice(i, i + 3);
        if (triple === '"""' || triple === "'''") {
          const q = triple;
          let j = i + 3;
          while (j < n && input.slice(j, j + 3) !== q) { v += input[j]; j++; }
          i = j + 3;
        } else {
          const q = c;
          let j = i + 1;
          while (j < n && input[j] !== q) {
            if (input[j] === '\\') {
              const nx = input[j + 1];
              v += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx === 'r' ? '\r' : nx;
              j += 2;
            } else { v += input[j]; j++; }
          }
          i = j + 1;
        }
        const tok = { k: 'str', v };
        if (input[i] === '@') {
          let j = i + 1;
          while (j < n && /[a-zA-Z-]/.test(input[j])) j++;
          tok.lang = input.slice(i + 1, j);
          i = j;
        } else if (input.slice(i, i + 2) === '^^') {
          i += 2;
          if (input[i] === '<') {
            let j = i + 1;
            while (j < n && input[j] !== '>') j++;
            tok.dtype = { k: 'iri', v: input.slice(i + 1, j) };
            i = j + 1;
          } else {
            let j = i;
            while (j < n && !isWS(input[j]) && !'.;,[]()'.includes(input[j])) j++;
            tok.dtype = { k: 'pname', v: input.slice(i, j) };
            i = j;
          }
        }
        tokens.push(tok);
        continue;
      }
      if ('.;,[]()'.includes(c)) {
        // '.' that starts a number?
        if (c === '.' && /[0-9]/.test(input[i + 1] || '')) {
          // fall through to number handling below
        } else {
          tokens.push({ k: 'punc', v: c });
          i++;
          continue;
        }
      }
      if (/[0-9]/.test(c) || ((c === '+' || c === '-' || c === '.') && /[0-9]/.test(input[i + 1] || ''))) {
        let j = i;
        if (input[j] === '+' || input[j] === '-') j++;
        while (j < n && /[0-9.eE+\-]/.test(input[j])) j++;
        tokens.push({ k: 'num', v: input.slice(i, j) });
        i = j;
        continue;
      }
      // bare word: 'a', true/false, prefixed name, @prefix, @base
      {
        let j = i;
        while (j < n && !isWS(input[j]) && !'.;,[]()#"\''.includes(input[j]) && input[j] !== '<') j++;
        const word = input.slice(i, j);
        i = j;
        if (word === 'a') tokens.push({ k: 'a' });
        else if (word === 'true' || word === 'false') tokens.push({ k: 'bool', v: word });
        else if (word[0] === '@') tokens.push({ k: 'kw', v: word.toLowerCase() });
        else if (/^prefix$/i.test(word)) tokens.push({ k: 'kw', v: '@prefix' });
        else if (/^base$/i.test(word)) tokens.push({ k: 'kw', v: '@base' });
        else tokens.push({ k: 'pname', v: word });
      }
    }
    return tokens;
  }

  function parse(tokens) {
    let pos = 0;
    const prefixes = {};
    const prefixOrder = [];
    const store = new Map(); // key -> { term, props: [ [predName, objTerm] ] }
    let bnodeCounter = 0;

    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const expectPunc = (v) => {
      const t = tokens[pos];
      if (!t || t.k !== 'punc' || t.v !== v) {
        throw new Error(`Expected "${v}" near token ${pos} (${t ? (t.v || t.k) : 'EOF'})`);
      }
      pos++;
    };

    function keyOf(term) {
      if (term.k === 'iri') return 'i:' + term.v;
      if (term.k === 'pname') return 'p:' + term.v;
      if (term.k === 'bnode') return 'b:' + term.id;
      return null;
    }
    function ensure(term) {
      const key = keyOf(term);
      if (!store.has(key)) store.set(key, { term, props: [] });
      return store.get(key);
    }

    function resolveFull(term) {
      if (term.k === 'iri') return term.v;
      if (term.k === 'a') return NS.rdf + 'type';
      if (term.k === 'pname') {
        const idx = term.v.indexOf(':');
        const p = term.v.slice(0, idx);
        const local = term.v.slice(idx + 1);
        const base = prefixes[p] || NS[p];
        if (base) return base + local;
        return term.v;
      }
      return null;
    }
    function predName(term) {
      const full = resolveFull(term);
      for (const p of Object.keys(NS)) {
        if (full && full.startsWith(NS[p])) return p + ':' + full.slice(NS[p].length);
      }
      return full;
    }

    function parseObject() {
      const t = peek();
      if (!t) throw new Error('Unexpected end of input');
      if (t.k === 'punc' && t.v === '[') {
        next();
        const id = 'b' + (bnodeCounter++);
        const term = { k: 'bnode', id };
        ensure(term);
        parsePredObjList(term);
        expectPunc(']');
        return term;
      }
      if (t.k === 'punc' && t.v === '(') {
        next();
        const items = [];
        while (peek() && !(peek().k === 'punc' && peek().v === ')')) {
          items.push(parseObject());
        }
        expectPunc(')');
        return { k: 'list', items };
      }
      next();
      return t;
    }

    function parseVerb() {
      const t = peek();
      if (t.k === 'a') { next(); return t; }
      if (t.k === 'pname' || t.k === 'iri') { next(); return t; }
      throw new Error(`Expected predicate near token ${pos}`);
    }

    function parsePredObjList(subjTerm) {
      const subj = ensure(subjTerm);
      for (;;) {
        const t = peek();
        if (!t) break;
        if (t.k === 'punc' && (t.v === ']' || t.v === '.')) break;
        const verb = parseVerb();
        const pName = predName(verb);
        for (;;) {
          const obj = parseObject();
          subj.props.push([pName, obj]);
          const sep = peek();
          if (sep && sep.k === 'punc' && sep.v === ',') { next(); continue; }
          break;
        }
        const sep = peek();
        if (sep && sep.k === 'punc' && sep.v === ';') {
          next();
          // allow trailing ';' before ] or .
          const after = peek();
          if (after && after.k === 'punc' && (after.v === ']' || after.v === '.')) break;
          continue;
        }
        break;
      }
    }

    while (pos < tokens.length) {
      const t = peek();
      if (t.k === 'kw' && t.v === '@prefix') {
        next();
        const pfxTok = next(); // pname like 'sh:'
        const pfx = (pfxTok.v || '').replace(/:$/, '');
        const iriTok = next();
        if (!iriTok || iriTok.k !== 'iri') throw new Error('Bad @prefix declaration');
        if (!(pfx in prefixes)) prefixOrder.push(pfx);
        prefixes[pfx] = iriTok.v;
        if (peek() && peek().k === 'punc' && peek().v === '.') next();
        continue;
      }
      if (t.k === 'kw' && t.v === '@base') {
        next(); next();
        if (peek() && peek().k === 'punc' && peek().v === '.') next();
        continue;
      }
      // a statement: subject predicateObjectList '.'
      const subj = parseObject();
      parsePredObjList(subj);
      if (peek() && peek().k === 'punc' && peek().v === '.') next();
    }

    return {
      prefixes, prefixOrder, store, resolveFull, predName,
    };
  }

  function compact(term, prefixes) {
    if (!term) return null;
    if (term.k === 'pname') return term.v;
    if (term.k === 'str') return term.v;
    if (term.k === 'num') return term.v;
    if (term.k === 'bool') return term.v;
    if (term.k === 'iri') {
      const merged = { ...NS, ...prefixes };
      for (const p of Object.keys(merged)) {
        if (term.v.startsWith(merged[p])) return (p || '') + ':' + term.v.slice(merged[p].length);
      }
      return '<' + term.v + '>';
    }
    return null;
  }

  function litValue(term) {
    if (!term) return null;
    if (term.k === 'str') return term.v;
    if (term.k === 'num') return term.v;
    if (term.k === 'bool') return term.v;
    if (term.k === 'pname') return term.v;
    return null;
  }
  function intValue(term) {
    const v = litValue(term);
    if (v === null || v === undefined || v === '') return null;
    const num = parseInt(v, 10);
    return Number.isNaN(num) ? null : num;
  }

  function findProp(rec, predName) {
    const hit = rec.props.find((p) => p[0] === predName);
    return hit ? hit[1] : null;
  }
  function findAll(rec, predName) {
    return rec.props.filter((p) => p[0] === predName).map((p) => p[1]);
  }

  const NUMERIC_DT = ['xsd:integer', 'xsd:decimal', 'xsd:double', 'xsd:float', 'xsd:long', 'xsd:int', 'xsd:nonNegativeInteger', 'xsd:positiveInteger'];

  function widgetIdFor(editor, datatype, nodeKind) {
    switch (editor) {
      case 'dash:TextAreaEditor': return 'TextAreaEditor';
      case 'dash:RichTextEditor': return 'RichTextEditor';
      case 'dash:URIEditor': return 'URIEditor';
      case 'dash:AutoCompleteEditor': return 'AutoCompleteEditor';
      case 'dash:InstancesSelectEditor': return 'InstancesSelectEditor';
      case 'dash:DetailsEditor': return 'DetailsEditor';
      case 'dash:EnumSelectEditor': return 'EnumSelectEditor';
      case 'dash:BooleanSelectEditor': return 'BooleanSelectEditor';
      case 'dash:DatePickerEditor': return 'DatePickerEditor';
      case 'dash:DateTimePickerEditor': return 'DateTimePickerEditor';
      case 'dash:TextFieldEditor':
        return NUMERIC_DT.includes(datatype) ? 'NumberFieldEditor' : 'TextFieldEditor';
      default: break;
    }
    // No editor declared: infer from datatype / nodeKind
    if (datatype === 'xsd:boolean') return 'BooleanSelectEditor';
    if (datatype === 'xsd:date') return 'DatePickerEditor';
    if (datatype === 'xsd:dateTime') return 'DateTimePickerEditor';
    if (NUMERIC_DT.includes(datatype)) return 'NumberFieldEditor';
    if ((nodeKind || '').includes('IRI')) return 'URIEditor';
    return 'TextFieldEditor';
  }

  function prettifyGroupIri(iri) {
    let s = String(iri).replace(/^:/, '').replace(/Group$/, '');
    s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
    return s.charAt(0).toUpperCase() + s.slice(1) || 'Properties';
  }

  let idSeq = 0;
  const mkId = (p) => `${p}_${(idSeq++).toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

  function parseShacl(text) {
    const { prefixes, prefixOrder, store } = parse(tokenize(text));

    const isType = (rec, p, local) => findAll(rec, 'rdf:type')
      .some((o) => {
        const c = compact(o, prefixes);
        return c === `${p}:${local}`;
      });

    // collect declared property groups
    const groupByIri = new Map();
    for (const rec of store.values()) {
      if (isType(rec, 'sh', 'PropertyGroup')) {
        const iri = compact(rec.term, prefixes);
        const label = litValue(findProp(rec, 'rdfs:label')) || prettifyGroupIri(iri);
        const order = intValue(findProp(rec, 'sh:order'));
        groupByIri.set(iri, {
          id: mkId('g'), label, order: order === null ? groupByIri.size : order, iri, fields: [],
        });
      }
    }

    // find the node shape
    let shapeRec = null;
    for (const rec of store.values()) {
      if (isType(rec, 'sh', 'NodeShape')) { shapeRec = rec; break; }
    }
    if (!shapeRec) throw new Error('No sh:NodeShape found in the document.');

    const schema = {
      schemaName: litValue(findProp(shapeRec, 'rdfs:label')) || '',
      schemaDescription: litValue(findProp(shapeRec, 'rdfs:comment')) || '',
      shapeIri: compact(shapeRec.term, prefixes) || ':Shape',
      targetClass: compact(findProp(shapeRec, 'sh:targetClass'), prefixes) || '',
      prefixes: [],
      groups: [],
    };

    // prefixes -> array (skip the default empty prefix; generator adds it implicitly)
    prefixOrder.forEach((p) => {
      if (p === '') return;
      schema.prefixes.push({ prefix: p, uri: prefixes[p] });
    });
    if (schema.prefixes.length === 0) {
      schema.prefixes = window.DEFAULT_PREFIXES.slice();
    }

    let defaultGroup = null;
    const ensureDefaultGroup = () => {
      if (!defaultGroup) {
        defaultGroup = {
          id: mkId('g'), label: 'Properties', order: groupByIri.size, iri: ':PropertiesGroup', fields: [],
        };
      }
      return defaultGroup;
    };

    // properties of the shape (blank nodes)
    const propTerms = findAll(shapeRec, 'sh:property');
    propTerms.forEach((pt, idx) => {
      const key = pt.k === 'bnode' ? 'b:' + pt.id : (pt.k === 'iri' ? 'i:' + pt.v : 'p:' + pt.v);
      const rec = store.get(key);
      if (!rec) return;
      const datatype = compact(findProp(rec, 'sh:datatype'), prefixes);
      const nodeKind = compact(findProp(rec, 'sh:nodeKind'), prefixes);
      const editor = compact(findProp(rec, 'dash:editor'), prefixes);
      const inTerm = findProp(rec, 'sh:in');
      let inValues = null;
      if (inTerm && inTerm.k === 'list') {
        inValues = inTerm.items.map((it) => litValue(it)).filter((v) => v !== null);
      }
      const field = {
        id: mkId('f'),
        widgetId: widgetIdFor(editor, datatype, nodeKind),
        name: litValue(findProp(rec, 'sh:name')) || '',
        description: litValue(findProp(rec, 'sh:description')) || '',
        path: compact(findProp(rec, 'sh:path'), prefixes) || '',
        datatype: datatype || null,
        class: compact(findProp(rec, 'sh:class'), prefixes) || null,
        nodeKind: nodeKind || null,
        minCount: intValue(findProp(rec, 'sh:minCount')),
        maxCount: intValue(findProp(rec, 'sh:maxCount')),
        minLength: intValue(findProp(rec, 'sh:minLength')),
        maxLength: intValue(findProp(rec, 'sh:maxLength')),
        pattern: litValue(findProp(rec, 'sh:pattern')) || '',
        defaultValue: litValue(findProp(rec, 'sh:defaultValue')) || '',
        inValues,
        order: intValue(findProp(rec, 'sh:order')),
      };
      if (field.order === null) field.order = idx;

      const gIri = compact(findProp(rec, 'sh:group'), prefixes);
      let target;
      if (gIri && groupByIri.has(gIri)) {
        target = groupByIri.get(gIri);
      } else if (gIri) {
        target = { id: mkId('g'), label: prettifyGroupIri(gIri), order: groupByIri.size, iri: gIri, fields: [] };
        groupByIri.set(gIri, target);
      } else {
        target = ensureDefaultGroup();
      }
      target.fields.push(field);
    });

    // assemble groups in order
    const groups = [...groupByIri.values()];
    if (defaultGroup && defaultGroup.fields.length > 0) groups.push(defaultGroup);
    groups.sort((a, b) => a.order - b.order);
    groups.forEach((g, i) => {
      g.order = i;
      g.fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      g.fields.forEach((f, k) => { f.order = k; });
      delete g.iri;
    });
    // drop empty groups only if there are populated ones
    const populated = groups.filter((g) => g.fields.length > 0);
    schema.groups = populated.length > 0 ? groups : groups;

    return schema;
  }

  window.parseShacl = parseShacl;
}());
