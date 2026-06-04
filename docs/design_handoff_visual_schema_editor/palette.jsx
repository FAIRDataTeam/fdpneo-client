/* global React */
const { useMemo, useState } = React;

function Icon({ name, size = 16 }) {
  const stroke = 'currentColor';
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'grip':
      return <svg {...common} strokeWidth="1.8"><circle cx="9" cy="6" r="0.6" fill={stroke}/><circle cx="15" cy="6" r="0.6" fill={stroke}/><circle cx="9" cy="12" r="0.6" fill={stroke}/><circle cx="15" cy="12" r="0.6" fill={stroke}/><circle cx="9" cy="18" r="0.6" fill={stroke}/><circle cx="15" cy="18" r="0.6" fill={stroke}/></svg>;
    case 'trash':
      return <svg {...common}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>;
    case 'duplicate':
      return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>;
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case 'code':
      return <svg {...common}><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>;
    case 'eye':
      return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'wand':
      return <svg {...common}><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></svg>;
    case 'document':
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
    case 'sparkle':
      return <svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/></svg>;
    case 'check':
      return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>;
    case 'chevron':
      return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case 'x':
      return <svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'layers':
      return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5zM3 17l9 5 9-5M3 12l9 5 9-5"/></svg>;
    case 'home':
      return <svg {...common}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>;
    default:
      return null;
  }
}

function widgetIconChar(w) {
  return <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{w.icon}</span>;
}

function Palette({ onDragStart, showDescriptions = true }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return window.WIDGETS;
    return window.WIDGETS.filter(
      (w) => w.name.toLowerCase().includes(needle)
        || w.desc.toLowerCase().includes(needle)
        || w.editor.toLowerCase().includes(needle),
    );
  }, [q]);

  const byCat = useMemo(() => {
    const m = new Map();
    filtered.forEach((w) => {
      if (!m.has(w.category)) m.set(w.category, []);
      m.get(w.category).push(w);
    });
    return m;
  }, [filtered]);

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Widgets</div>
          <div className="panel__subtitle">Drag to canvas · DASH</div>
        </div>
      </div>
      <div className="palette-search">
        <Icon name="search" size={14} />
        <input
          placeholder="Search widgets…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="panel__body panel__body--snug" style={{ paddingTop: 8 }}>
        {[...byCat.entries()].map(([cat, items]) => (
          <div className="palette-cat" key={cat}>
            <div className="palette-cat__label">{cat}</div>
            {items.map((w) => (
              <div
                key={w.id}
                className="palette-item"
                draggable
                onDragStart={(e) => onDragStart(e, w)}
                title={w.editor}
              >
                <div className="palette-item__icon">{widgetIconChar(w)}</div>
                <div className="palette-item__text">
                  <div className="palette-item__name">{w.name}</div>
                  {showDescriptions && <div className="palette-item__desc">{w.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

window.Palette = Palette;
window.Icon = Icon;
window.widgetIconChar = widgetIconChar;
