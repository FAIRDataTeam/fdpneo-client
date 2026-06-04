/* global React */
const { useState, useRef, useCallback } = React;

function newId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function fieldFromWidget(widget, order) {
  const f = {
    id: newId('f'),
    widgetId: widget.id,
    name: widget.name,
    description: '',
    path: ':' + widget.name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    order: order || 0,
    minCount: null,
    maxCount: null,
    minLength: null,
    maxLength: null,
    pattern: '',
    defaultValue: '',
    inValues: null,
    ...widget.defaults,
  };
  if (widget.id === 'EnumSelectEditor') {
    f.inValues = widget.defaults.inValues.slice();
  }
  return f;
}

function FieldCard({
  field, isSelected, isDragging, onSelect, onDelete, onDuplicate,
  onDragStart, onDragEnd,
}) {
  const w = window.WIDGET_BY_ID[field.widgetId];
  const required = (field.minCount || 0) > 0;
  const multi = field.maxCount === null || field.maxCount === undefined || field.maxCount > 1;

  return (
    <div
      className={`field${isSelected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div
        className="field__grip"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <window.Icon name="grip" size={16} />
      </div>
      <div className="field__icon">{window.widgetIconChar(w)}</div>
      <div className="field__main">
        <div className="field__name-row">
          <span className="field__name">{field.name || '(unnamed)'}</span>
          {required && <span className="field__req" title="Required">●</span>}
          {multi && <span className="field__badge">multi</span>}
        </div>
        <div className="field__meta">
          <span>{field.path}</span>
          <span>·</span>
          <span>{field.datatype || field.class || field.nodeKind || w.editor.replace('dash:', '')}</span>
        </div>
      </div>
      <div className="field__actions">
        <button className="btn btn-ghost btn-xs" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
          <window.Icon name="duplicate" size={13} />
        </button>
        <button className="btn btn-danger-ghost btn-xs" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <window.Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}

function Canvas({
  schema, selectedId, onSelectField, onSelectSchema, onSelectGroup,
  selectedKind, mutate,
}) {
  // drag state: either palette widget OR existing field id
  const dragRef = useRef(null);
  const [dragKind, setDragKind] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null); // { groupId, beforeFieldId }

  const startPaletteDrag = useCallback((e, widget) => {
    dragRef.current = { type: 'palette', widget };
    setDragKind('palette');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', widget.id);
  }, []);
  window.__paletteDragStart = startPaletteDrag;

  const startFieldDrag = (e, field, groupId) => {
    dragRef.current = { type: 'field', fieldId: field.id, fromGroup: groupId };
    setDragKind('field');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', field.id);
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragKind(null);
    setHoverTarget(null);
  };

  const onDragOverField = (e, groupId, fieldId, position /* 'before'|'after' */) => {
    if (!dragRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = dragRef.current.type === 'palette' ? 'copy' : 'move';
    setHoverTarget({ groupId, fieldId, position });
  };
  const onDragOverGroup = (e, groupId) => {
    if (!dragRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragRef.current.type === 'palette' ? 'copy' : 'move';
    setHoverTarget({ groupId, fieldId: null, position: 'end' });
  };

  const onDrop = (e, targetGroupId) => {
    e.preventDefault();
    e.stopPropagation();
    const target = hoverTarget;
    const dr = dragRef.current;
    if (!dr) { endDrag(); return; }

    mutate((draft) => {
      // remove from origin if moving an existing field
      let movedField = null;
      if (dr.type === 'field') {
        for (const g of draft.groups) {
          const idx = g.fields.findIndex((f) => f.id === dr.fieldId);
          if (idx >= 0) {
            movedField = g.fields.splice(idx, 1)[0];
            break;
          }
        }
      } else {
        // palette: build a new field
        movedField = fieldFromWidget(dr.widget, 0);
      }
      if (!movedField) return;

      const destGroupId = (target && target.groupId) || targetGroupId;
      const destGroup = draft.groups.find((g) => g.id === destGroupId) || draft.groups[draft.groups.length - 1];
      if (!destGroup) return;

      if (target && target.fieldId) {
        const idx = destGroup.fields.findIndex((f) => f.id === target.fieldId);
        const insertAt = target.position === 'after' ? idx + 1 : idx;
        destGroup.fields.splice(insertAt, 0, movedField);
      } else {
        destGroup.fields.push(movedField);
      }
      // re-number orders
      destGroup.fields.forEach((f, i) => { f.order = i; });
    });

    onSelectField(dr.type === 'field' ? dr.fieldId : null);
    endDrag();
  };

  const addGroup = () => {
    mutate((draft) => {
      const order = draft.groups.length;
      draft.groups.push({
        id: newId('g'), label: `Section ${order + 1}`, order, fields: [],
      });
    });
  };
  const renameGroup = (gid, label) => {
    mutate((draft) => {
      const g = draft.groups.find((x) => x.id === gid);
      if (g) g.label = label;
    });
  };
  const deleteGroup = (gid) => {
    mutate((draft) => {
      const idx = draft.groups.findIndex((x) => x.id === gid);
      if (idx >= 0) draft.groups.splice(idx, 1);
      draft.groups.forEach((g, i) => { g.order = i; });
    });
  };
  const deleteField = (gid, fid) => {
    mutate((draft) => {
      const g = draft.groups.find((x) => x.id === gid);
      if (!g) return;
      g.fields = g.fields.filter((f) => f.id !== fid);
      g.fields.forEach((f, i) => { f.order = i; });
    });
  };
  const duplicateField = (gid, fid) => {
    mutate((draft) => {
      const g = draft.groups.find((x) => x.id === gid);
      if (!g) return;
      const i = g.fields.findIndex((f) => f.id === fid);
      if (i < 0) return;
      const copy = JSON.parse(JSON.stringify(g.fields[i]));
      copy.id = newId('f');
      copy.name = copy.name + ' (copy)';
      g.fields.splice(i + 1, 0, copy);
      g.fields.forEach((f, k) => { f.order = k; });
    });
  };

  const totalFields = schema.groups.reduce((s, g) => s + g.fields.length, 0);

  return (
    <div className="panel canvas">
      <div className="panel__header">
        <div>
          <div className="panel__title">Form canvas</div>
          <div className="panel__subtitle">
            {totalFields} {totalFields === 1 ? 'property' : 'properties'} in {schema.groups.length} {schema.groups.length === 1 ? 'group' : 'groups'}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={addGroup}>
          <window.Icon name="plus" size={13} /> Add group
        </button>
      </div>
      <div className="panel__body panel__body--snug">
        <div
          className="canvas__inner"
          onClick={() => onSelectField(null)}
        >
          {/* Schema banner */}
          <div
            className="target-banner"
            onClick={(e) => { e.stopPropagation(); onSelectSchema(); }}
            style={{
              cursor: 'pointer',
              borderColor: selectedKind === 'schema' ? 'var(--color-primary)' : undefined,
              boxShadow: selectedKind === 'schema' ? '0 0 0 3px rgba(0,81,142,0.08)' : undefined,
            }}
          >
            <div className="target-banner__main">
              <div className="target-banner__icon"><window.Icon name="layers" size={18} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="target-banner__name">{schema.schemaName || 'Untitled schema'}</div>
                <div className="target-banner__sub">
                  sh:NodeShape · sh:targetClass {schema.targetClass || '?'}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onSelectSchema(); }}>
              <window.Icon name="gear" size={13} /> Schema settings
            </button>
          </div>

          {schema.groups.length === 0 && totalFields === 0 && (
            <div className="canvas-empty">
              <div className="canvas-empty__icon"><window.Icon name="wand" size={36} /></div>
              <div className="canvas-empty__title">Drop widgets here to design your form</div>
              <div className="canvas-empty__sub">Drag any widget from the left panel onto this canvas.</div>
            </div>
          )}

          {schema.groups.map((g) => (
            <div className="group-card" key={g.id}>
              <div
                className="group-card__header"
                onClick={(e) => { e.stopPropagation(); onSelectGroup(g.id); }}
              >
                <window.Icon name="layers" size={14} />
                <input
                  className="group-card__title"
                  value={g.label}
                  onChange={(e) => renameGroup(g.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="group-card__actions">
                  <button
                    className="btn btn-danger-ghost btn-xs"
                    title="Delete group"
                    onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}
                  >
                    <window.Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
              <div
                className="group-card__body"
                onDragOver={(e) => onDragOverGroup(e, g.id)}
                onDrop={(e) => onDrop(e, g.id)}
              >
                {g.fields.length === 0 && (
                  <div className="group-card__drop-here">Drop a widget here</div>
                )}
                {g.fields.map((f, i) => (
                  <React.Fragment key={f.id}>
                    {hoverTarget && hoverTarget.groupId === g.id && hoverTarget.fieldId === f.id && hoverTarget.position === 'before' && (
                      <div className="drop-indicator" />
                    )}
                    <div
                      onDragOver={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mid = rect.top + rect.height / 2;
                        const pos = e.clientY < mid ? 'before' : 'after';
                        onDragOverField(e, g.id, f.id, pos);
                      }}
                      onDrop={(e) => onDrop(e, g.id)}
                    >
                      <FieldCard
                        field={f}
                        isSelected={selectedKind === 'field' && selectedId === f.id}
                        isDragging={dragKind === 'field' && dragRef.current && dragRef.current.fieldId === f.id}
                        onSelect={() => onSelectField(f.id)}
                        onDelete={() => deleteField(g.id, f.id)}
                        onDuplicate={() => duplicateField(g.id, f.id)}
                        onDragStart={(e) => startFieldDrag(e, f, g.id)}
                        onDragEnd={endDrag}
                      />
                    </div>
                    {hoverTarget && hoverTarget.groupId === g.id && hoverTarget.fieldId === f.id && hoverTarget.position === 'after' && (
                      <div className="drop-indicator" />
                    )}
                  </React.Fragment>
                ))}
                {hoverTarget && hoverTarget.groupId === g.id && hoverTarget.fieldId === null && g.fields.length > 0 && (
                  <div className="drop-indicator" />
                )}
              </div>
            </div>
          ))}

          <div className="canvas-add-group">
            <button className="btn btn-ghost btn-sm" onClick={addGroup}>
              <window.Icon name="plus" size={13} /> Add another group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Canvas = Canvas;
window.fieldFromWidget = fieldFromWidget;
window.newId = newId;
