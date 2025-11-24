/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { setSelectionBoundsTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('setSelectionBoundsTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('applies bounds and supports undo/redo', async () => {
    const shape = { id: 'shape-bounds-1', name: 'Bounds Shape', x: 10, y: 20, width: 40, height: 50, resize: (w: number, h: number) => { shape.width = w; shape.height = h; } } as any;
    (globalThis as any).penpot = {
      selection: [shape],
      currentPage: {
        getShapeById: (id: string) => (id === shape.id ? shape : null),
      },
    };

    const response = await setSelectionBoundsTool({ x: 15, y: 25, width: 100, height: 80 });
    expect(response.success).not.toBe(false);
    expect(shape.x).toBe(15);
    expect(shape.y).toBe(25);
    expect(shape.width).toBe(100);
    expect(shape.height).toBe(80);

    const undoResponse = await undoLastAction({});
    expect(undoResponse.success).not.toBe(false);
    expect(shape.x).toBe(10);
    expect(shape.y).toBe(20);
    expect(shape.width).toBe(40);
    expect(shape.height).toBe(50);

    const redoResponse = await redoLastAction({});
    expect(redoResponse.success).not.toBe(false);
    expect(shape.x).toBe(15);
    expect(shape.y).toBe(25);
    expect(shape.width).toBe(100);
    expect(shape.height).toBe(80);
  });

  it('rejects negative width/height', async () => {
    (globalThis as any).penpot = {
      selection: [{ id: 's-neg', name: 'S' }],
      currentPage: { getShapeById: () => null },
    };
    const response = await setSelectionBoundsTool({ width: -1 });
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/non-negative/);
  });

  it('returns MISSING_BOUNDS when shape lacks width/height', async () => {
    const shapeNoBounds = { id: 'shape-nobounds', name: 'NoBounds' } as any;
    (globalThis as any).penpot = {
      selection: [shapeNoBounds],
      currentPage: { getShapeById: (id: string) => (id === shapeNoBounds.id ? shapeNoBounds : null) },
    };

    const response = await setSelectionBoundsTool({ width: 10, height: 10 });
    expect(response.success).toBe(false);
    expect(response.message).toBe('MISSING_BOUNDS');
    // @ts-expect-error
    expect(response.payload.shapesWithoutBounds[0].id).toBe(shapeNoBounds.id);
  });

  it('skips locked shapes and applies to unlocked shapes', async () => {
    const locked = { id: 'locked-b', name: 'LockedB', locked: true, x: 1, y: 2, width: 10, height: 11 } as any;
    const unlocked = { id: 'unlocked-b', name: 'UnlockedB', x: 3, y: 4, width: 20, height: 21, resize: (w: number, h: number) => { unlocked.width = w; unlocked.height = h; } } as any;
    (globalThis as any).penpot = {
      selection: [locked, unlocked],
      currentPage: { getShapeById: (id: string) => (id === locked.id ? locked : id === unlocked.id ? unlocked : null) },
    };

    const response = await setSelectionBoundsTool({ width: 50, height: 60 });
    expect(response.success).not.toBe(false);
    expect(unlocked.width).toBe(50);
    expect(unlocked.height).toBe(60);
    expect(locked.width).toBe(10);
    // @ts-expect-error
    expect(response.payload.changedShapeIds).toEqual([unlocked.id]);
    // @ts-expect-error
    expect(response.payload.skippedLockedShapes).toBeDefined();
  });

  it('returns API_ERROR when setter throws', async () => {
    const bad = Object.defineProperty({ id: 'bad-b', name: 'BadB', x: 0, y: 0, width: 1, height: 1 }, 'width', {
      configurable: true,
      enumerable: true,
      get() { return 1; },
      set(_v) { throw new Error('boom width'); }
    }) as any;

    (globalThis as any).penpot = {
      selection: [bad],
      currentPage: { getShapeById: (id: string) => (id === bad.id ? bad : null) },
    };

    const response = await setSelectionBoundsTool({ width: 42 });
    expect(response.success).toBe(false);
    expect(response.message).toBe('API_ERROR');
    // @ts-expect-error payload typing
    expect(response.payload.actionName).toBe('setSelectionBounds');
  });
});
