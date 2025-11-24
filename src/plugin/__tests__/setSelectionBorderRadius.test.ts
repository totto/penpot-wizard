/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { setSelectionBorderRadiusTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('setSelectionBorderRadiusTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('applies requested border radius and supports undo/redo', async () => {
    const shape = { id: 'shape-radius-1', name: 'Radius Shape', borderRadius: 0 } as any;
    (globalThis as any).penpot = {
      selection: [shape],
      currentPage: {
        getShapeById: (id: string) => (id === shape.id ? shape : null),
      },
    };

    const response = await setSelectionBorderRadiusTool({ borderRadius: 12 });
    expect(response.success).not.toBe(false);
    expect(shape.borderRadius).toBe(12);

    const undoResponse = await undoLastAction({});
    expect(undoResponse.success).not.toBe(false);
    expect(shape.borderRadius).toBe(0);

    const redoResponse = await redoLastAction({});
    expect(redoResponse.success).not.toBe(false);
    expect(shape.borderRadius).toBe(12);
  });

  it('rejects invalid negative radius', async () => {
    (globalThis as any).penpot = {
      selection: [{ id: 'shape-invalid', name: 'Invalid Shape', borderRadius: 0 }],
      currentPage: {
        getShapeById: () => null,
      },
    };

    const response = await setSelectionBorderRadiusTool({ borderRadius: -5 });
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/non-negative/);
  });

  it('returns MISSING_BORDER_RADIUS when a shape lacks borderRadius property', async () => {
    const shapeWithNoProp = { id: 'shape-no-prop', name: 'NoProp' } as any;
    (globalThis as any).penpot = {
      selection: [shapeWithNoProp],
      currentPage: { getShapeById: (id: string) => (id === shapeWithNoProp.id ? shapeWithNoProp : null) },
    };

    const response = await setSelectionBorderRadiusTool({ borderRadius: 5 });
    expect(response.success).toBe(false);
    expect(response.message).toBe('MISSING_BORDER_RADIUS');
    // @ts-expect-error - payload typing
    expect(response.payload.shapesWithoutBorderRadius).toBeDefined();
    // ensure the payload includes the shape id
    // @ts-expect-error
    expect(response.payload.shapesWithoutBorderRadius[0].id).toBe(shapeWithNoProp.id);
  });

  it('skips locked shapes and applies to unlocked ones', async () => {
    const locked = { id: 'locked-1', name: 'Locked', locked: true, borderRadius: 2 } as any;
    const unlocked = { id: 'unlocked-1', name: 'Unlocked', borderRadius: 3 } as any;
    (globalThis as any).penpot = {
      selection: [locked, unlocked],
      currentPage: { getShapeById: (id: string) => (id === locked.id ? locked : id === unlocked.id ? unlocked : null) },
    };

    const response = await setSelectionBorderRadiusTool({ borderRadius: 16 });
    expect(response.success).not.toBe(false);
    // unlocked should have new radius
    expect(unlocked.borderRadius).toBe(16);
    // locked should remain unchanged
    expect(locked.borderRadius).toBe(2);
    // response payload should include changedShapeIds for unlocked only
    // @ts-expect-error
    expect(response.payload.changedShapeIds).toEqual([unlocked.id]);
    // @ts-expect-error
    expect(response.payload.skippedLockedShapes).toBeDefined();
  });

  it('returns API_ERROR when a shape setter throws', async () => {
    const bad = Object.defineProperty({ id: 'bad', name: 'Bad', borderRadius: 0 }, 'borderRadius', {
      configurable: true,
      enumerable: true,
      get() { return 0; },
      set(_v) { throw new Error('boom'); }
    }) as any;

    (globalThis as any).penpot = {
      selection: [bad],
      currentPage: { getShapeById: (id: string) => (id === bad.id ? bad : null) },
    };

    const response = await setSelectionBorderRadiusTool({ borderRadius: 5 });
    expect(response.success).toBe(false);
    expect(response.message).toBe('API_ERROR');
    // @ts-expect-error payload typing
    expect(response.payload.actionName).toBe('setSelectionBorderRadius');
  });
});
