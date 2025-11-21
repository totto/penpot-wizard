/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { setSelectionOpacityTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('setSelectionOpacityTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('applies requested opacity and supports undo/redo', async () => {
    const shape = { id: 'shape-opacity-1', name: 'Opacity Shape', opacity: 1 };
    (globalThis as any).penpot = {
      selection: [shape],
      currentPage: {
        getShapeById: (id: string) => (id === shape.id ? shape : null),
      },
    };

    const response = await setSelectionOpacityTool({ opacity: 0.5 });
    expect(response.success).not.toBe(false);
    expect(shape.opacity).toBe(0.5);

    const undoResponse = await undoLastAction({});
    expect(undoResponse.success).not.toBe(false);
    expect(shape.opacity).toBe(1);

    const redoResponse = await redoLastAction({});
    expect(redoResponse.success).not.toBe(false);
    expect(shape.opacity).toBe(0.5);
  });

  it('rejects invalid opacity values', async () => {
    (globalThis as any).penpot = {
      selection: [{ id: 'shape-invalid', name: 'Invalid Shape', opacity: 1 }],
      currentPage: {
        getShapeById: () => null,
      },
    };

    const response = await setSelectionOpacityTool({ opacity: 1.5 });
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/between 0\.0 and 1\.0/);
  });
});
