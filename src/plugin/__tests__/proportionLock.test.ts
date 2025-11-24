/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleSelectionProportionLockTool, undoLastAction, redoLastAction } from '../mainHandlers';
import { updateCurrentSelection } from '../actionSelection';

describe('toggleSelectionProportionLockTool and undo/redo', () => {
  const originalPenpot = (globalThis as any).penpot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('locks a single unlocked shape proportions and supports undo/redo', async () => {
    const s: any = { id: 'p-1', name: 'Shape1', keepAspectRatio: false };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeTruthy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeFalsy();

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeTruthy();
  });

  it('unlocks a single locked shape proportions and supports undo/redo', async () => {
    const s: any = { id: 'p-2', name: 'Shape2', keepAspectRatio: true };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: false });
    expect(resp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeFalsy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeTruthy();

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeFalsy();
  });

  it('respects shapeIds when provided', async () => {
    const a: any = { id: 'a', name: 'A', keepAspectRatio: false };
    const b: any = { id: 'b', name: 'B', keepAspectRatio: false };
    (globalThis as any).penpot = { selection: [a, b], currentPage: { getShapeById: (id: string) => (id === a.id ? a : id === b.id ? b : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: true, shapeIds: [b.id] });
    expect(resp.success).toBeTruthy();
    expect(a.keepAspectRatio).toBeFalsy();
    expect(b.keepAspectRatio || b.constrainProportions || b.lockProportions || b.preserveAspectRatio).toBeTruthy();
  });

  it('falls back to currentSelectionIds when penpot.selection is empty', async () => {
    const s: any = { id: 'p-fallback', name: 'Fallback', keepAspectRatio: false };
    (globalThis as any).penpot = { selection: [], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    // populate action-level selection ids
    updateCurrentSelection([s.id]);

    const resp = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio).toBeTruthy();
  });

  it('handles shapes that expose constrainProportions instead of keepAspectRatio', async () => {
    const s: any = { id: 'p-3', name: 'ConstrainOnly', constrainProportions: false };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.constrainProportions || s.keepAspectRatio || s.lockProportions || s.preserveAspectRatio).toBeTruthy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.constrainProportions || s.keepAspectRatio || s.lockProportions || s.preserveAspectRatio).toBeFalsy();
  });

  it('handles shapes that put ratio lock inside constraints.lockRatio', async () => {
    const s: any = { id: 'p-constraint', name: 'ConstraintNested', constraints: { lockRatio: false } };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.constraints?.lockRatio || s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio || s.lockRatio).toBeTruthy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.constraints?.lockRatio || s.keepAspectRatio || s.constrainProportions || s.lockProportions || s.preserveAspectRatio || s.lockRatio).toBeFalsy();
  });

  it('handles shapes that expose proportionLock (top-level) instead of keepAspectRatio', async () => {
    const s: any = { id: 'p-prop', name: 'TopProportion', proportionLock: false };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.proportionLock || s.keepAspectRatio || s.constrainProportions).toBeTruthy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.proportionLock || s.keepAspectRatio || s.constrainProportions).toBeFalsy();
  });

  it('handles shapes that put proportionLock inside constraints.proportionLock', async () => {
    const s: any = { id: 'p-prop-constraint', name: 'ConstraintProportion', constraints: { proportionLock: false } };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const resp = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp.success).toBeTruthy();
    expect(s.constraints?.proportionLock || s.constraints?.lockRatio || s.keepAspectRatio).toBeTruthy();

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s.constraints?.proportionLock || s.constraints?.lockRatio || s.keepAspectRatio).toBeFalsy();
  });

  it('logs toggle operations and skipped shapes', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // lock operation
    const sOn: any = { id: 'p-log-1', name: 'LogOne', keepAspectRatio: false };
    (globalThis as any).penpot = { selection: [sOn], currentPage: { getShapeById: (id: string) => (id === sOn.id ? sOn : null) } };
    await toggleSelectionProportionLockTool({ lock: true });
    expect(logSpy.mock.calls.some(c => String(c[0]).includes(`toggling ON proportion lock for shape ${sOn.id}`))).toBeTruthy();

    // unlock operation
    const sOff: any = { id: 'p-log-2', name: 'LogTwo', keepAspectRatio: true };
    (globalThis as any).penpot = { selection: [sOff], currentPage: { getShapeById: (id: string) => (id === sOff.id ? sOff : null) } };
    await toggleSelectionProportionLockTool({ lock: false });
    expect(logSpy.mock.calls.some(c => String(c[0]).includes(`toggling OFF proportion lock for shape ${sOff.id}`))).toBeTruthy();

    // skipped (editor lock)
    const sSkip: any = { id: 'p-log-3', name: 'LogSkip', keepAspectRatio: false, locked: true };
    (globalThis as any).penpot = { selection: [sSkip], currentPage: { getShapeById: (id: string) => (id === sSkip.id ? sSkip : null) } };
    await toggleSelectionProportionLockTool({ lock: true });
    expect(logSpy.mock.calls.some(c => String(c[0]).includes(`skipping shape ${sSkip.id}`))).toBeTruthy();

    logSpy.mockRestore();
  });

  it('falls back to currentPage.getSelectedShapes when selection is inaccessible and toggles twice', async () => {
    // Simulate host where penpot.selection is empty and currentSelectionIds not used,
    // but currentPage.getSelectedShapes returns the selected shapes list
    const s: any = { id: 'p-page', name: 'PageSel', keepAspectRatio: false };
    (globalThis as any).penpot = {
      selection: [],
      currentPage: { getSelectedShapes: () => [s], getShapeById: (id: string) => (id === s.id ? s : null) }
    };

    // First call: lock
    const resp1 = await toggleSelectionProportionLockTool({ lock: true });
    expect(resp1.success).toBeTruthy();
    expect(s.keepAspectRatio || s.proportionLock || s.constrainProportions).toBeTruthy();

    // Second call: unlock (toggle back)
    const resp2 = await toggleSelectionProportionLockTool({ lock: false });
    expect(resp2.success).toBeTruthy();
    expect(s.keepAspectRatio || s.proportionLock || s.constrainProportions).toBeFalsy();
  });

  it('emits a developer debug dump when debugDump=true', async () => {
    const s: any = { id: 'p-debug-1', name: 'DebugMe', keepAspectRatio: false, extra: { foo: 'bar' } };
    (globalThis as any).penpot = { selection: [s], currentPage: { getShapeById: (id: string) => (id === s.id ? s : null) } };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const resp = await toggleSelectionProportionLockTool({ lock: true, debugDump: true });
    expect(resp.success).toBeTruthy();
    // We expect at least one console.log call that includes DEBUG DUMP and the shape id
    expect(logSpy.mock.calls.some(c => String(c[0]).includes(`DEBUG DUMP (${s.id})`))).toBeTruthy();
    logSpy.mockRestore();
  });
});
