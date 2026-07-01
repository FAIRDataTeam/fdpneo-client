import { describe, it, expect } from 'vitest';
import { fieldFromWidget } from '../composables/useSchema';
import { WIDGETS, WIDGET_BY_ID } from '../data';

describe('fieldFromWidget', () => {
  it('creates a field with the correct widgetId', () => {
    const widget = WIDGET_BY_ID['TextFieldEditor']!;
    const f = fieldFromWidget(widget, 0);
    expect(f.widgetId).toBe('TextFieldEditor');
  });

  it('seeds name from widget.name', () => {
    const widget = WIDGET_BY_ID['TextFieldEditor']!;
    const f = fieldFromWidget(widget);
    expect(f.name).toBe(widget.name);
  });

  it('derives a path slug from widget.name', () => {
    const widget = WIDGET_BY_ID['TextFieldEditor']!;
    const f = fieldFromWidget(widget);
    expect(f.path).toMatch(/^:/);
    expect(f.path).not.toMatch(/\s/);
  });

  it('assigns the given order', () => {
    const widget = WIDGET_BY_ID['DatePickerEditor']!;
    const f = fieldFromWidget(widget, 4);
    expect(f.order).toBe(4);
  });

  it('copies nodeKind from widget defaults', () => {
    const widget = WIDGET_BY_ID['URIEditor']!;
    const f = fieldFromWidget(widget);
    expect(f.nodeKind).toBe('sh:IRI');
  });

  it('copies datatype from widget defaults', () => {
    const widget = WIDGET_BY_ID['TextFieldEditor']!;
    const f = fieldFromWidget(widget);
    expect(f.datatype).toBe('xsd:string');
  });

  it('copies inValues from widget defaults without shared reference', () => {
    const widget = WIDGET_BY_ID['EnumSelectEditor']!;
    const f1 = fieldFromWidget(widget);
    const f2 = fieldFromWidget(widget);
    f1.inValues?.push({ value: 'extra', kind: 'literal' });
    expect(f2.inValues?.some((v) => v.value === 'extra')).toBe(false);
  });

  it('sets node to null', () => {
    const widget = WIDGET_BY_ID['DetailsEditor']!;
    const f = fieldFromWidget(widget);
    expect(f.node).toBeNull();
  });

  it('generates unique IDs for each call', () => {
    const widget = WIDGET_BY_ID['TextFieldEditor']!;
    const ids = Array.from({ length: 20 }, () => fieldFromWidget(widget).id);
    expect(new Set(ids).size).toBe(20);
  });

  it('produces a valid field for every widget in the catalog', () => {
    for (const widget of WIDGETS) {
      const f = fieldFromWidget(widget);
      expect(f.id).toBeTruthy();
      expect(f.widgetId).toBe(widget.id);
      expect(f.path).toMatch(/^:/);
    }
  });
});
