/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleSelectionVisibilityTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('toggleSelectionVisibilityTool and undo/redo', () => {
  const originalPenpot = (globalThis as any).penpot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('hides a single visible shape and supports undo/redo', async () => {
    const s = { id: 's-1', name: 'Shape1', visible: true };
    (globalThis as any).penpot = {
      selection: [s],
      currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) },
    };

    const resp = await toggleSelectionVisibilityTool({ hide: true });
    expect(resp.success).toBeTruthy();
    expect(s.visible).toBeFalsy();
    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.visible).toBeTruthy();
    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s.visible).toBeFalsy();
  });

  it('unhides a single hidden shape and supports undo/redo', async () => {
    const s = { id: 's-2', name: 'Shape2', visible: false };
    (globalThis as any).penpot = {
      selection: [s],
      currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) },
    };

    const resp = await toggleSelectionVisibilityTool({ hide: false });
    expect(resp.success).toBeTruthy();
    expect(s.visible).toBeTruthy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.visible).toBeFalsy();

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s.visible).toBeTruthy();
  });

  it('returns mixed selection prompt when selection contains both visible and hidden shapes', async () => {
    const hidden = { id: 's-hide', name: 'Hidden', visible: false };
    const visible = { id: 's-visible', name: 'Visible', visible: true };
    (globalThis as any).penpot = {
      selection: [hidden, visible],
      currentPage: { getShapeById: (id: string) => (id === hidden.id ? hidden : id === visible.id ? visible : null) },
    };

    const resp = await toggleSelectionVisibilityTool({});
    expect(resp.success).toBeFalsy();
    const payload = resp.payload as any;
    expect(payload.hiddenShapes).toBeDefined();
    expect(payload.unhiddenShapes).toBeDefined();
    expect(payload.hiddenShapes.length).toBe(1);
    expect(payload.unhiddenShapes.length).toBe(1);
  });

  it('respects shapeIds when provided', async () => {
    const a = { id: 'a', name: 'A', visible: true };
    const b = { id: 'b', name: 'B', visible: true };
    (globalThis as any).penpot = {
      selection: [a, b],
      currentPage: { getShapeById: (id: string) => (id === a.id ? a : id === b.id ? b : null) },
    };

    const resp = await toggleSelectionVisibilityTool({ hide: true, shapeIds: [b.id] });
    expect(resp.success).toBeTruthy();
    expect(a.visible).toBeTruthy();
    expect(b.visible).toBeFalsy();
  });
});
