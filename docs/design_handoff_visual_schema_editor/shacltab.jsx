/* global React, window */
const { useRef, useCallback } = React;

// Editable code surface with a syntax-highlight overlay behind a transparent textarea.
function CodeEditor({ value, onChange }) {
  const taRef = useRef(null);
  const preRef = useRef(null);

  const syncScroll = useCallback(() => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }, []);

  const html = window.SchemaGen.highlightTurtle(value + (value.endsWith('\n') ? ' ' : ''));

  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart;
      const en = ta.selectionEnd;
      const next = value.slice(0, s) + '  ' + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  };

  return (
    <div className="code-editor">
      <pre
        ref={preRef}
        className="code-editor__pre shacl-output"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        ref={taRef}
        className="code-editor__ta"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

function ShaclTab({
  schema, shaclText, onChange, parseError, onReformat,
}) {
  const totalFields = schema.groups.reduce((s, g) => s + g.fields.length, 0);
  const copy = () => navigator.clipboard?.writeText(shaclText);

  return (
    <div className="shacl-tab">
      <div className="tabs-callout">
        <strong>SHACL source</strong> — write the metadata schema directly in Turtle. Every edit is parsed live and reflected in the <strong>Visual Editor</strong> and <strong>Form Preview</strong>. Likewise, changes you make in the Visual Editor are written back here.
      </div>

      <div className="code-card">
        <div className="code-card__header">
          <div className="code-card__title">
            <window.Icon name="code" size={14} /> Form Definition · Turtle
          </div>
          <div className="code-card__tools">
            {parseError
              ? (
                <span className="parse-pill parse-pill--err" title={parseError}>
                  <window.Icon name="x" size={12} /> Invalid SHACL
                </span>
              )
              : (
                <span className="parse-pill parse-pill--ok">
                  <window.Icon name="check" size={12} /> Synced · {totalFields} {totalFields === 1 ? 'property' : 'properties'}
                </span>
              )}
            <button className="btn btn-ghost btn-xs" onClick={onReformat} title="Re-format from model">
              <window.Icon name="wand" size={12} /> Tidy
            </button>
            <button className="btn btn-ghost btn-xs" onClick={copy} title="Copy Turtle">
              <window.Icon name="duplicate" size={12} /> Copy
            </button>
          </div>
        </div>
        <CodeEditor value={shaclText} onChange={onChange} />
        {parseError && (
          <div className="parse-error">
            <window.Icon name="x" size={13} />
            <span>{String(parseError)}</span>
            <span className="parse-error__note">— the form keeps the last valid version until this is fixed.</span>
          </div>
        )}
      </div>

      <div className="actions-bar">
        <div className="actions-bar__hint">
          Target class <span style={{ fontFamily: 'var(--font-mono)' }}>{schema.targetClass || '—'}</span>
          &nbsp;·&nbsp; {schema.groups.length} {schema.groups.length === 1 ? 'group' : 'groups'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary">Cancel</button>
          <button className="btn btn-primary" disabled={!!parseError}>
            <window.Icon name="check" size={13} /> Save
          </button>
          <button className="btn btn-primary" disabled={!!parseError}>
            <window.Icon name="sparkle" size={13} /> Save and release
          </button>
        </div>
      </div>
    </div>
  );
}

window.ShaclTab = ShaclTab;
