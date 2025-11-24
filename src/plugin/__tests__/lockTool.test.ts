/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleSelectionLockTool, undoLastAction, redoLastAction } from '../mainHandlers';
import { updateCurrentSelection } from '../actionSelection';

describe('toggleSelectionLockTool and undo/redo', () => {
  const originalPenpot = (globalThis as any).penpot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('locks a single unlocked shape and supports undo/redo', async () => {
    const s = { id: 's-1', name: 'Shape1', locked: false };
    (globalThis as any).penpot = {
      selection: [s],
      currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) },
    };

  const resp = await toggleSelectionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.locked).toBeTruthy();
    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.locked).toBeFalsy();
    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s.locked).toBeTruthy();
  });

  it('unlocks a single locked shape and supports undo/redo', async () => {
    const s = { id: 's-2', name: 'Shape2', locked: true };
    (globalThis as any).penpot = {
      selection: [s],
      currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) },
    };

  const resp = await toggleSelectionLockTool({ lock: false });
    expect(resp.success).toBeTruthy();
    expect(s.locked).toBeFalsy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.locked).toBeTruthy();

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s.locked).toBeFalsy();
  });

  it('returns mixed selection prompt when selection contains both locked and unlocked shapes', async () => {
    const locked = { id: 's-lock', name: 'Locked', locked: true };
    const unlocked = { id: 's-unlock', name: 'Unlocked', locked: false };
    (globalThis as any).penpot = {
      selection: [locked, unlocked],
      currentPage: { getShapeById: (id: string) => (id === locked.id ? locked : id === unlocked.id ? unlocked : null) },
    };

  const resp = await toggleSelectionLockTool({});
    expect(resp.success).toBeFalsy();
    const payload = resp.payload as any;
    expect(payload.lockedShapes).toBeDefined();
    expect(payload.unlockedShapes).toBeDefined();
    expect(payload.lockedShapes.length).toBe(1);
    expect(payload.unlockedShapes.length).toBe(1);
  });

  it('respects shapeIds when provided', async () => {
    const a = { id: 'a', name: 'A', locked: false };
    const b = { id: 'b', name: 'B', locked: false };
    (globalThis as any).penpot = {
      selection: [a, b],
      currentPage: { getShapeById: (id: string) => (id === a.id ? a : id === b.id ? b : null) },
    };

  const resp = await toggleSelectionLockTool({ lock: true, shapeIds: [b.id] });
    expect(resp.success).toBeTruthy();
    expect(a.locked).toBeFalsy();
    expect(b.locked).toBeTruthy();
  });

  it('falls back to currentSelectionIds when penpot.selection is empty', async () => {
    const s = { id: 's-fallback', name: 'Fallback', locked: false };
    (globalThis as any).penpot = {
      selection: [],
      currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) },
    };

    // populate action-level selection ids
    updateCurrentSelection([s.id]);

    const resp = await toggleSelectionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.locked).toBeTruthy();
  });
});
