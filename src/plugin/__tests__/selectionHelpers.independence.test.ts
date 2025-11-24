/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { readSelectionInfo } from '../selectionHelpers';

describe('readSelectionInfo independence', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('works using penpot.currentPage.getSelectedShapes fallback', () => {
    (globalThis as any).penpot = {
      selection: undefined,
      currentPage: {
        getSelectedShapes: () => [
          { id: 'b2', name: 'Board', type: 'board', x: 0, y: 0, width: 800, height: 600 },
        ],
      },
    };

    const result = readSelectionInfo();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('b2');
    expect(result[0].width).toBe(800);
  });

  it('does not mutate the underlying selection objects', () => {
    const shapeObj = { id: 'z7', name: 'Box', type: 'rectangle', x: 1, y: 2, width: 10, height: 20 };
    (globalThis as any).penpot = { selection: [shapeObj] };

    const before = JSON.stringify(shapeObj);
    const result = readSelectionInfo();
    const after = JSON.stringify(shapeObj);

    expect(result.length).toBe(1);
    expect(before).toEqual(after); // original object unchanged
  });

  it('falls back to currentPage.getSelectedShapes when penpot.selection exists but is empty', () => {
    (globalThis as any).penpot = {
      selection: [],
      currentPage: {
        getSelectedShapes: () => [
          { id: 'fallback-1', name: 'Fallback', type: 'ellipse', x: 5, y: 6, width: 12, height: 12 },
        ],
      },
    };

    const result = readSelectionInfo();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('fallback-1');
    expect(result[0].type).toBe('ellipse');
  });
});