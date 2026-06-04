/* global React, window */
const { useState, useMemo } = React;

function FormPreview({ schema }) {
  const groups = useMemo(() => schema.groups.slice().sort((a, b) => a.order - b.order), [schema]);
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);

  const totalFields = groups.reduce((s, g) => s + g.fields.length, 0);

  const setVal = (id, v) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setResult(null);
  };

  const validate = () => {
    const missing = [];
    groups.forEach((g) => g.fields.forEach((f) => {
      const req = (f.minCount || 0) > 0;
      const empty = values[f.id] === undefined || values[f.id] === null || values[f.id] === '';
      if (req && empty) missing.push(f);
    }));
    setResult({ ok: missing.length === 0, missing: missing.map((f) => f.id), count: missing.length });
  };

  const reset = () => { setValues({}); setResult(null); };

  return (
    <div className="form-preview-wrap">
      <div className="tabs-callout">
        <strong>Form Preview</strong> — this is the data-entry form a curator would use to populate a record of type <span style={{ fontFamily: 'var(--font-mono)' }}>{schema.targetClass || '?'}</span>. It is generated live from the schema, so you can test the form here as you edit it in the other tabs.
      </div>

      <div className="preview-pane">
        <div className="preview-pane__header">
          <div className="preview-pane__title">{schema.schemaName || 'Untitled'} · data entry</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-lighter)' }}>
            {totalFields} fields
          </div>
        </div>

        {result && (
          <div className={`validate-banner ${result.ok ? 'validate-banner--ok' : 'validate-banner--err'}`}>
            <window.Icon name={result.ok ? 'check' : 'x'} size={14} />
            {result.ok
              ? 'All required fields are filled — this record would validate against the schema.'
              : `${result.count} required field${result.count === 1 ? '' : 's'} still need a value.`}
          </div>
        )}

        <div className="form-preview">
          {groups.length === 0 && (
            <div style={{ color: 'var(--color-text-lighter)', textAlign: 'center', padding: 30 }}>
              Add fields in the Visual Editor (or SHACL tab) to generate a form.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.id}>
              <div className="form-preview__group-title">{g.label}</div>
              {g.fields.map((f) => (
                <RenderedField
                  key={f.id}
                  field={f}
                  value={values[f.id]}
                  invalid={result && !result.ok && result.missing.includes(f.id)}
                  onChange={(v) => setVal(f.id, v)}
                />
              ))}
            </div>
          ))}
        </div>

        {totalFields > 0 && (
          <div className="preview-actions">
            <button className="btn btn-ghost btn-sm" onClick={reset}>Clear</button>
            <button className="btn btn-primary btn-sm" onClick={validate}>
              <window.Icon name="check" size={13} /> Validate record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderedField({ field, value, invalid, onChange }) {
  const w = window.WIDGET_BY_ID[field.widgetId];
  const required = (field.minCount || 0) > 0;
  const multi = field.maxCount === null || field.maxCount === undefined || field.maxCount > 1;
  const editor = w.id;
  const v = value === undefined ? '' : value;
  const cls = invalid ? 'invalid' : '';

  let input;
  if (editor === 'TextAreaEditor' || editor === 'RichTextEditor') {
    input = <textarea className={cls} value={v} placeholder={field.defaultValue || ''} onChange={(e) => onChange(e.target.value)} />;
  } else if (editor === 'BooleanSelectEditor') {
    input = (
      <select className={cls} value={v} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  } else if (editor === 'EnumSelectEditor') {
    input = (
      <select className={cls} value={v} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {(field.inValues || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    );
  } else if (editor === 'DatePickerEditor') {
    input = <input type="date" className={cls} value={v} onChange={(e) => onChange(e.target.value)} />;
  } else if (editor === 'DateTimePickerEditor') {
    input = <input type="datetime-local" className={cls} value={v} onChange={(e) => onChange(e.target.value)} />;
  } else if (editor === 'NumberFieldEditor') {
    input = <input type="number" className={cls} value={v} onChange={(e) => onChange(e.target.value)} />;
  } else if (editor === 'URIEditor' || editor === 'AutoCompleteEditor' || editor === 'InstancesSelectEditor') {
    input = (
      <input
        type="text"
        className={`mono ${cls}`}
        value={v}
        placeholder={editor === 'AutoCompleteEditor' ? 'Start typing to search…' : 'http://…'}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (editor === 'DetailsEditor') {
    input = (
      <div className="nested-stub">▢ Nested {field.class || field.path} sub-form</div>
    );
  } else {
    input = <input type="text" className={cls} value={v} placeholder={field.defaultValue || ''} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div className="form-row">
      <label className={required ? 'required' : ''}>
        {field.name || '(unnamed)'}
        {multi && <span className="multi-tag">multiple</span>}
      </label>
      {input}
      {field.description && <div className="hint">{field.description}</div>}
    </div>
  );
}

window.FormPreview = FormPreview;
