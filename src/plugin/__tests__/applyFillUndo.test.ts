/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { applyFillTool, undoLastAction } from '../mainHandlers';

describe('applyFillTool undo behavior', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('applies fill and undo restores previous fill', async () => {
    // Set up a shape with no fills
    const shape = { id: 's-fill-1', name: 'Rect', fills: [], x: 0, y: 0 };
    (globalThis as any).penpot = {
      selection: [ shape ],
      currentPage: {
        getShapeById: (id: string) => (id === shape.id ? shape : null),
      }
    };

    // Apply a red fill
    const response = await applyFillTool({ fillColor: '#ff0000', fillOpacity: 1 });
    expect(response.success).not.toBe(false);
  expect(Array.isArray((shape as any).fills)).toBe(true);
  expect((shape as any).fills[0].fillColor).toBe('#ff0000');

    // Undo the action
  const undoResp = await undoLastAction({});
  console.log('undoResp:', undoResp);
  expect(undoResp.success).not.toBe(false);
    // After undo, previous fill should have been restored (empty array)
  expect(Array.isArray((shape as any).fills)).toBe(true);
    // If there was no previous fill, fills should be empty
    expect(shape.fills.length).toBe(0);
  });
});
