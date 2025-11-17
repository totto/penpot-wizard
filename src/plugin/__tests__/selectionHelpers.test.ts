/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { readSelectionInfo } from '../selectionHelpers';

describe('readSelectionInfo', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('returns empty array when nothing selected', () => {
    (globalThis as any).penpot = {};
    const result = readSelectionInfo();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('reads selection properties when selection present', () => {
    (globalThis as any).penpot = {
      selection: [
        { id: 'a1', name: 'Rect', type: 'rectangle', x: 10, y: 20, width: 100, height: 200 },
      ],
    };

    const result = readSelectionInfo();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a1');
    expect(result[0].width).toBe(100);
    expect(result[0].height).toBe(200);
  });
});