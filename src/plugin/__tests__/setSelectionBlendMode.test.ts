/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { setSelectionBlendModeTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('setSelectionBlendModeTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('applies a valid blend mode and supports undo/redo', async () => {
    const shape = { id: 'shape-blend-1', name: 'Blend Shape', blendMode: 'normal' };
    (globalThis as any).penpot = {
      selection: [shape],
      currentPage: {
        getShapeById: (id: string) => (id === shape.id ? shape : null),
      },
    };

    const response = await setSelectionBlendModeTool({ blendMode: 'multiply' });
    expect(response.success).not.toBe(false);
    expect(shape.blendMode).toBe('multiply');

    const undoResponse = await undoLastAction({});
    expect(undoResponse.success).not.toBe(false);
    expect(shape.blendMode).toBe('normal');

    const redoResponse = await redoLastAction({});
    expect(redoResponse.success).not.toBe(false);
    expect(shape.blendMode).toBe('multiply');
  });

  it('rejects unsupported blend modes', async () => {
    (globalThis as any).penpot = {
      selection: [{ id: 'shape-blend-2', name: 'Blend Shape', blendMode: 'normal' }],
      currentPage: {
        getShapeById: () => null,
      },
    };

    const response = await setSelectionBlendModeTool({ blendMode: 'nonsense' as any });
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/Unsupported blend mode/);
  });

  it('returns NO_SELECTION when nothing is selected', async () => {
    (globalThis as any).penpot = {
      selection: [],
      currentPage: {
        getShapeById: () => null,
      },
    };

    const response = await setSelectionBlendModeTool({ blendMode: 'multiply' });
    expect(response.success).toBe(false);
    expect(response.message).toBe('NO_SELECTION');
  });
});
