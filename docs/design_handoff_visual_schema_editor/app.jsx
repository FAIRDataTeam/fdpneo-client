/* global React, ReactDOM, window */
const { useState, useMemo, useCallback, useRef, useEffect } = React;

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "accent": "#00518E",
  "showDescriptions": true
}/*EDITMODE-END*/;

const ACCENTS = {
  '#00518E': { darker: '#003A6A', lighter: '#1A6BA8', soft: '#BFD4E3', tint: '#E8F0F7' },
  '#0B7285': { darker: '#075562', lighter: '#1198AE', soft: '#B8DDE3', tint: '#E4F2F4' },
  '#3B3F9E': { darker: '#2B2E78', lighter: '#5A5EC4', soft: '#C7C9EC', tint: '#ECEDF9' },
};

function App() {
  const [tab, setTab] = useState('visual'); // 'shacl' | 'visual' | 'preview'

  // ---- single source of truth: the schema model ----
  const [schema, setSchema] = useState(() => deepClone(window.SEED_SCHEMA));
  const [shaclText, setShaclText] = useState(() => window.SchemaGen.generateShacl(window.SEED_SCHEMA));
  const [parseError, setParseError] = useState(null);
  const schemaRef = useRef(schema);
  useEffect(() => { schemaRef.current = schema; }, [schema]);

  const [selectedKind, setSelectedKind] = useState('schema');
  const [selectedId, setSelectedId] = useState(null);

  const { TweaksPanel } = window;
  const t = (window.useTweaks || (() => [TWEAK_DEFAULS, () => {}]))(TWEAK_DEFAULS);
  const tweaks = t[0]; const setTweak = t[1];

  // apply accent tweak to CSS variables
  useEffect(() => {
    const primary = tweaks.accent || '#00518E';
    const a = ACCENTS[primary] || ACCENTS['#00518E'];
    const r = document.documentElement.style;
    r.setProperty('--color-primary', primary);
    r.setProperty('--color-primary-darker', a.darker);
    r.setProperty('--color-primary-lighter', a.lighter);
    r.setProperty('--color-primary-soft', a.soft);
    r.setProperty('--color-primary-tint', a.tint);
  }, [tweaks.accent]);

  // Visual-editor edits: mutate model -> regenerate SHACL text.
  const mutate = useCallback((mut) => {
    const draft = deepClone(schemaRef.current);
    mut(draft);
    schemaRef.current = draft;
    setSchema(draft);
    setShaclText(window.SchemaGen.generateShacl(draft));
    setParseError(null);
  }, []);

  // SHACL edits: parse text -> model (form follows). Keep last good model on error.
  const onShaclChange = useCallback((text) => {
    setShaclText(text);
    try {
      const parsed = window.parseShacl(text);
      schemaRef.current = parsed;
      setSchema(parsed);
      setParseError(null);
      // selection ids are regenerated on parse; reset to schema
      setSelectedKind('schema');
      setSelectedId(null);
    } catch (e) {
      setParseError(e.message || String(e));
    }
  }, []);

  const reformat = useCallback(() => {
    const text = window.SchemaGen.generateShacl(schemaRef.current);
    setShaclText(text);
    setParseError(null);
  }, []);

  const onSelectField = useCallback((id) => {
    if (!id) { setSelectedKind('schema'); setSelectedId(null); return; }
    setSelectedKind('field'); setSelectedId(id);
  }, []);
  const onSelectGroup = useCallback((id) => { setSelectedKind('group'); setSelectedId(id); }, []);
  const onSelectSchema = useCallback(() => { setSelectedKind('schema'); setSelectedId(null); }, []);

  const totalFields = schema.groups.reduce((s, g) => s + g.fields.length, 0);

  return (
    <div>
      <header className="fdp-header" data-screen-label="App Header">
        <div className="fdp-header__logo">
          <div className="fdp-header__logo-mark">FDP</div>
          FAIR Data Point
        </div>
        <nav className="fdp-header__nav">
          <a href="#" onClick={(e) => e.preventDefault()}>Catalogs</a>
          <a href="#" className="is-active" onClick={(e) => e.preventDefault()}>Metadata schemas</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Users</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Settings</a>
        </nav>
        <div className="fdp-header__spacer" />
        <div className="fdp-header__user">
          <span>Anna Steward</span>
          <div className="fdp-header__avatar">AS</div>
        </div>
      </header>

      <div className="fdp-crumbs">
        <a href="#" onClick={(e) => e.preventDefault()}><window.Icon name="home" size={12} /></a>
        <span className="sep">/</span>
        <a href="#" onClick={(e) => e.preventDefault()}>Metadata Schemas</a>
        <span className="sep">/</span>
        <span className="current">Edit {schema.schemaName || 'Schema'}</span>
      </div>

      <div className="fdp-page" data-screen-label="Edit Metadata Schema">
        <h1 className="fdp-page__title">Edit {schema.schemaName || 'Metadata Schema'}</h1>

        <ul className="nav-tabs">
          <li>
            <a
              className={`nav-link${tab === 'shacl' ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); setTab('shacl'); }}
            >
              <window.Icon name="code" size={14} /> SHACL
              {parseError && <span className="tab-dot tab-dot--err" title="Parse error" />}
            </a>
          </li>
          <li>
            <a
              className={`nav-link${tab === 'visual' ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); setTab('visual'); }}
            >
              <window.Icon name="wand" size={14} /> Visual Editor <span className="tag-new">New</span>
            </a>
          </li>
          <li>
            <a
              className={`nav-link${tab === 'preview' ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); setTab('preview'); }}
            >
              <window.Icon name="eye" size={14} /> Form Preview
            </a>
          </li>
        </ul>

        {tab === 'shacl' && (
          <window.ShaclTab
            schema={schema}
            shaclText={shaclText}
            onChange={onShaclChange}
            parseError={parseError}
            onReformat={reformat}
          />
        )}

        {tab === 'visual' && (
          <VisualTab
            schema={schema}
            mutate={mutate}
            selectedKind={selectedKind}
            selectedId={selectedId}
            onSelectField={onSelectField}
            onSelectGroup={onSelectGroup}
            onSelectSchema={onSelectSchema}
            onClear={onSelectSchema}
            totalFields={totalFields}
            showDescriptions={tweaks.showDescriptions !== false}
          />
        )}

        {tab === 'preview' && (
          <window.FormPreview schema={schema} />
        )}
      </div>

      {TweaksPanel && (
        <TweaksPanel title="Tweaks">
          <window.TweakSection label="Appearance">
            <window.TweakColor
              label="Accent"
              value={tweaks.accent}
              onChange={(v) => setTweak('accent', v)}
              options={['#00518E', '#0B7285', '#3B3F9E']}
            />
            <window.TweakToggle
              label="Widget descriptions in palette"
              value={tweaks.showDescriptions}
              onChange={(v) => setTweak('showDescriptions', v)}
            />
          </window.TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

function VisualTab({
  schema, mutate, selectedKind, selectedId,
  onSelectField, onSelectGroup, onSelectSchema, onClear, totalFields, showDescriptions,
}) {
  const onPaletteDragStart = (e, widget) => {
    if (window.__paletteDragStart) window.__paletteDragStart(e, widget);
  };
  return (
    <>
      <div className="tabs-callout">
        <strong>Visual Editor</strong> — drag DASH form widgets from the palette onto the canvas to compose your form. Each widget becomes a SHACL <span style={{ fontFamily: 'var(--font-mono)' }}>sh:property</span>; the Turtle is written live to the <strong>SHACL</strong> tab and the rendered form updates in <strong>Form Preview</strong>.
      </div>

      <div className="workbench">
        <window.Palette onDragStart={onPaletteDragStart} showDescriptions={showDescriptions} />
        <window.Canvas
          schema={schema}
          mutate={mutate}
          selectedKind={selectedKind}
          selectedId={selectedId}
          onSelectField={onSelectField}
          onSelectGroup={onSelectGroup}
          onSelectSchema={onSelectSchema}
        />
        <window.Inspector
          schema={schema}
          selectedKind={selectedKind}
          selectedId={selectedId}
          mutate={mutate}
          onClear={onClear}
        />
      </div>

      <div className="actions-bar">
        <div className="actions-bar__hint">
          <window.Icon name="check" size={12} /> <span className="ok">Synced with SHACL</span>
          &nbsp;·&nbsp; {totalFields} properties, {schema.groups.length} groups
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary">Cancel</button>
          <button className="btn btn-primary"><window.Icon name="check" size={13} /> Save</button>
          <button className="btn btn-primary"><window.Icon name="sparkle" size={13} /> Save and release</button>
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
