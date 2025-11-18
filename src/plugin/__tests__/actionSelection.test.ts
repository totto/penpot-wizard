/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { currentSelectionIds, updateCurrentSelection, getSelectionForAction, hasValidSelection } from '../actionSelection';

describe('actionSelection helper', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('updates currentSelectionIds when updateCurrentSelection is called', () => {
    updateCurrentSelection(['x1', 'y2']);
    expect(currentSelectionIds.length).toBeGreaterThan(0);
    expect(currentSelectionIds).toContain('x1');
  });

  it('getSelectionForAction returns selection when penpot.selection has shapes', () => {
    (globalThis as any).penpot = {
      selection: [{ id: 's1' }, { id: 's2' }],
    };

    const shapes = getSelectionForAction();
    expect(Array.isArray(shapes)).toBe(true);
    expect(shapes.length).toBe(2);
  });

  it('hasValidSelection returns true only when penpot.selection has items', () => {
    (globalThis as any).penpot = { selection: [] };
    expect(hasValidSelection()).toBe(false);

    (globalThis as any).penpot = { selection: [{id: 'x'}] };
    expect(hasValidSelection()).toBe(true);
  });
});
