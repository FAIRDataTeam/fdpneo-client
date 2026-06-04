/* global React */
const { useState } = React;

function TextRow({ label, value, onChange, placeholder, mono, required }) {
  return (
    <div className="form-row">
      <label className={required ? 'required' : ''}>{label}</label>
      <input
        type="text"
        className={mono ? 'mono' : ''}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function TextAreaRow({ label, value, onChange, placeholder }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <textarea
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function NumberRow({ label, value, onChange, placeholder, min }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <input
        type="number"
        value={value === null || value === undefined ? '' : value}
        placeholder={placeholder}
        min={min}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
      />
    </div>
  );
}
function SelectRow({ label, value, onChange, options, placeholder }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{placeholder || '— none —'}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function InValuesEditor({ values, onChange }) {
  const [input, setInput] = useState('');
  const items = values || [];
  const addItem = () => {
    if (!input.trim()) return;
    onChange([...items, input.trim()]);
    setInput('');
  };
  const removeItem = (i) => {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next.length ? next : null);
  };
  return (
    <div className="form-row">
      <label>Allowed values (sh:in)</label>
      <div className="tag-row">
        {items.map((v, i) => (
          <span className="tag" key={i}>
            {v}
            <button onClick={() => removeItem(i)}><window.Icon name="x" size={11} /></button>
          </span>
        ))}
        <input
          value={input}
          placeholder="Add value + Enter"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
        />
      </div>
      <div className="hint">Press Enter to add. Stored as sh:in ( "a" "b" "c" ).</div>
    </div>
  );
}

function FieldInspector({ field, group, onChange }) {
  const w = window.WIDGET_BY_ID[field.widgetId];
  const isLiteral = (field.nodeKind || '').includes('Literal');
  const isIRI = (field.nodeKind || '').includes('IRI');
  const set = (k, v) => onChange({ ...field, [k]: v });

  return (
    <div>
      <div className="field-head">
        <div className="field-head__icon">{window.widgetIconChar(w)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>{w.name}</div>
          <div className="field-head__editor">{w.editor}</div>
        </div>
      </div>

      <div className="insp-section">
        <div className="insp-section__title">Basic</div>
        <TextRow label="Label (sh:name)" value={field.name} onChange={(v) => set('name', v)} required />
        <TextAreaRow label="Description" value={field.description} onChange={(v) => set('description', v)} placeholder="Help text shown to the user" />
        <TextRow label="Property path (sh:path)" value={field.path} onChange={(v) => set('path', v)} mono required placeholder="dct:title" />
      </div>

      <div className="insp-section">
        <div className="insp-section__title">Constraints</div>
        <div className="form-row-2">
          <NumberRow label="Min count" value={field.minCount} onChange={(v) => set('minCount', v)} placeholder="0" min={0} />
          <NumberRow label="Max count" value={field.maxCount} onChange={(v) => set('maxCount', v)} placeholder="∞" min={1} />
        </div>
        <SelectRow label="Node kind" value={field.nodeKind} onChange={(v) => set('nodeKind', v)} options={window.NODE_KINDS} placeholder="— none —" />
        {isLiteral && (
          <SelectRow label="Datatype" value={field.datatype} onChange={(v) => set('datatype', v)} options={window.DATATYPES} placeholder="— none —" />
        )}
        {isIRI && (
          <TextRow label="Class (sh:class)" value={field.class} onChange={(v) => set('class', v)} mono placeholder="foaf:Agent" />
        )}
        {isLiteral && (
          <>
            <div className="form-row-2">
              <NumberRow label="Min length" value={field.minLength} onChange={(v) => set('minLength', v)} placeholder="0" min={0} />
              <NumberRow label="Max length" value={field.maxLength} onChange={(v) => set('maxLength', v)} placeholder="∞" min={1} />
            </div>
            <TextRow label="Pattern (regex)" value={field.pattern} onChange={(v) => set('pattern', v)} mono placeholder="^[A-Z].*" />
          </>
        )}
        {(field.widgetId === 'EnumSelectEditor' || (field.inValues && field.inValues.length > 0)) && (
          <InValuesEditor values={field.inValues} onChange={(v) => set('inValues', v)} />
        )}
      </div>

      <div className="insp-section">
        <div className="insp-section__title">Defaults & order</div>
        <TextRow label="Default value" value={field.defaultValue} onChange={(v) => set('defaultValue', v)} placeholder="—" />
        <NumberRow label="Order (sh:order)" value={field.order} onChange={(v) => set('order', v)} min={0} />
        <div className="form-row">
          <label>Group</label>
          <input type="text" disabled value={group ? group.label : ''} />
          <div className="hint">Move the field by dragging it into another group.</div>
        </div>
      </div>
    </div>
  );
}

function PrefixEditor({ prefixes, onChange }) {
  const [draft, setDraft] = useState({ prefix: '', uri: '' });
  const add = () => {
    if (!draft.prefix.trim() || !draft.uri.trim()) return;
    onChange([...prefixes, { prefix: draft.prefix.trim(), uri: draft.uri.trim() }]);
    setDraft({ prefix: '', uri: '' });
  };
  const remove = (i) => {
    const next = prefixes.slice();
    next.splice(i, 1);
    onChange(next);
  };
  return (
    <div className="form-row">
      <label>Prefixes</label>
      <div style={{
        border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden',
      }}>
        {prefixes.map((p, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 0,
            alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11,
            borderBottom: '1px solid var(--color-separator)',
          }}>
            <div style={{ padding: '6px 8px', background: 'var(--color-bg-highlight)', color: 'var(--color-primary)', fontWeight: 700 }}>{p.prefix}:</div>
            <div style={{ padding: '6px 8px', color: 'var(--color-text-default)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.uri}</div>
            <button className="btn btn-danger-ghost btn-xs" onClick={() => remove(i)} title="Remove"><window.Icon name="x" size={11} /></button>
          </div>
        ))}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 4, padding: 4, background: '#FBFCFD',
        }}>
          <input
            placeholder="ns"
            value={draft.prefix}
            onChange={(e) => setDraft({ ...draft, prefix: e.target.value })}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 3 }}
          />
          <input
            placeholder="http://…"
            value={draft.uri}
            onChange={(e) => setDraft({ ...draft, uri: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 3 }}
          />
          <button className="btn btn-secondary btn-xs" onClick={add}><window.Icon name="plus" size={11} /></button>
        </div>
      </div>
    </div>
  );
}

function SchemaInspector({ schema, onChange }) {
  const set = (k, v) => onChange({ ...schema, [k]: v });
  return (
    <div>
      <div className="field-head">
        <div className="field-head__icon"><window.Icon name="layers" size={18} /></div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Schema settings</div>
          <div className="field-head__editor">sh:NodeShape</div>
        </div>
      </div>
      <div className="insp-section">
        <div className="insp-section__title">Identity</div>
        <TextRow label="Schema name" value={schema.schemaName} onChange={(v) => set('schemaName', v)} required />
        <TextAreaRow label="Description" value={schema.schemaDescription} onChange={(v) => set('schemaDescription', v)} />
      </div>
      <div className="insp-section">
        <div className="insp-section__title">Shape definition</div>
        <TextRow label="Shape IRI" value={schema.shapeIri} onChange={(v) => set('shapeIri', v)} mono placeholder=":DatasetShape" />
        <TextRow label="Target class (sh:targetClass)" value={schema.targetClass} onChange={(v) => set('targetClass', v)} mono placeholder="dcat:Dataset" required />
      </div>
      <div className="insp-section">
        <div className="insp-section__title">Vocabularies</div>
        <PrefixEditor prefixes={schema.prefixes} onChange={(v) => set('prefixes', v)} />
      </div>
    </div>
  );
}

function GroupInspector({ group, onChange, onDelete }) {
  const set = (k, v) => onChange({ ...group, [k]: v });
  return (
    <div>
      <div className="field-head">
        <div className="field-head__icon"><window.Icon name="layers" size={18} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Group</div>
          <div className="field-head__editor">sh:PropertyGroup</div>
        </div>
      </div>
      <div className="insp-section">
        <div className="insp-section__title">Properties</div>
        <TextRow label="Label" value={group.label} onChange={(v) => set('label', v)} required />
        <NumberRow label="Order" value={group.order} onChange={(v) => set('order', v)} min={0} />
        <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>
          <window.Icon name="trash" size={13} /> Delete group
        </button>
      </div>
    </div>
  );
}

function Inspector({ schema, selectedKind, selectedId, mutate, onClear }) {
  let content;

  if (selectedKind === 'field' && selectedId) {
    let field; let group;
    for (const g of schema.groups) {
      const f = g.fields.find((x) => x.id === selectedId);
      if (f) { field = f; group = g; break; }
    }
    if (field) {
      content = (
        <FieldInspector
          field={field}
          group={group}
          onChange={(next) => {
            mutate((draft) => {
              const g = draft.groups.find((x) => x.id === group.id);
              if (!g) return;
              const i = g.fields.findIndex((f) => f.id === field.id);
              if (i >= 0) g.fields[i] = next;
            });
          }}
        />
      );
    }
  } else if (selectedKind === 'group' && selectedId) {
    const group = schema.groups.find((g) => g.id === selectedId);
    if (group) {
      content = (
        <GroupInspector
          group={group}
          onChange={(next) => {
            mutate((draft) => {
              const i = draft.groups.findIndex((g) => g.id === group.id);
              if (i >= 0) draft.groups[i] = next;
            });
          }}
          onDelete={() => {
            mutate((draft) => {
              const i = draft.groups.findIndex((g) => g.id === group.id);
              if (i >= 0) draft.groups.splice(i, 1);
            });
            onClear();
          }}
        />
      );
    }
  } else {
    content = (
      <SchemaInspector
        schema={schema}
        onChange={(next) => mutate((draft) => { Object.assign(draft, next); })}
      />
    );
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Inspector</div>
          <div className="panel__subtitle">
            {selectedKind === 'field' ? 'Property settings' : selectedKind === 'group' ? 'Group settings' : 'Schema settings'}
          </div>
        </div>
        {(selectedKind === 'field' || selectedKind === 'group') && (
          <button className="btn btn-ghost btn-xs" onClick={onClear} title="Back to schema">
            <window.Icon name="x" size={13} />
          </button>
        )}
      </div>
      <div className="panel__body panel__body--snug">
        {content}
      </div>
    </div>
  );
}

window.Inspector = Inspector;
