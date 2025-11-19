/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { moveSelectionTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('moveSelectionTool and undo/redo', () => {
  const originalPenpot = (globalThis as any).penpot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('moves a shape by dx/dy and undo/redo restores positions', async () => {
    const shape = { id: 's-move-1', name: 'Rect', x: 10, y: 20 };
    (globalThis as any).penpot = {
      selection: [shape],
      currentPage: {
        getShapeById: (id: string) => (id === shape.id ? shape : null),
      },
    };

    const moveResp = await moveSelectionTool({ dx: 5, dy: -10 });
    expect(moveResp.success).toBeTruthy();
    expect(shape.x).toBe(15);
    expect(shape.y).toBe(10);

  // verify undoData contains the previous positions
  expect((moveResp.payload as any)?.undoInfo).toBeDefined();
  const undoData: any = (moveResp.payload as any)?.undoInfo?.undoData;
  expect(undoData.previousPositions[0].x).toBe(10);

  const undoResp = await undoLastAction({});
  console.log('After undo shape in test:', shape);
    expect(undoResp.success).toBeTruthy();
  expect(shape.x).toBe(10);
  expect(shape.y).toBe(20);
  // Also verify currentPage.getShapeById reflects the same values
  const fromPage = (globalThis as any).penpot.currentPage.getShapeById(shape.id);
  expect(fromPage.x).toBe(10);
  expect(fromPage.y).toBe(20);

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(shape.x).toBe(15);
    expect(shape.y).toBe(10);
  });

  it('moves multiple shapes and undo/redo restores all positions', async () => {
    const s1 = { id: 's-move-a', name: 'A', x: 0, y: 0 };
    const s2 = { id: 's-move-b', name: 'B', x: 100, y: 100 };
    (globalThis as any).penpot = {
      selection: [s1, s2],
      currentPage: {
        getShapeById: (id: string) => (id === s1.id ? s1 : id === s2.id ? s2 : null),
      },
    };

    const moved = await moveSelectionTool({ dx: 10, dy: 20 });
    expect(moved.success).toBeTruthy();
    expect(s1.x).toBe(10);
    expect(s1.y).toBe(20);
    expect(s2.x).toBe(110);
    expect(s2.y).toBe(120);

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(s1.x).toBe(0);
    expect(s1.y).toBe(0);
    expect(s2.x).toBe(100);
    expect(s2.y).toBe(100);

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(s1.x).toBe(10);
    expect(s1.y).toBe(20);
    expect(s2.x).toBe(110);
    expect(s2.y).toBe(120);
  });

  it('skips locked shapes when moving', async () => {
    const locked = { id: 's-locked', name: 'Locked', x: 5, y: 5, locked: true };
    const unlocked = { id: 's-unlocked', name: 'Unlocked', x: 0, y: 0 };

    (globalThis as any).penpot = {
      selection: [locked, unlocked],
      currentPage: {
        getShapeById: (id: string) => (id === locked.id ? locked : id === unlocked.id ? unlocked : null),
      },
    };

    const resp = await moveSelectionTool({ dx: 10, dy: 10 });
    expect(resp.success).toBeTruthy();
    // locked shape should not move
    expect(locked.x).toBe(5);
    expect(locked.y).toBe(5);
    // unlocked shape should move
    expect(unlocked.x).toBe(10);
    expect(unlocked.y).toBe(10);

  // The response should include skipped locked shapes
  expect((resp.payload as any)?.skippedLocked).toEqual([locked.id]);

    // undo/redo should only affect the moved shape
    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(unlocked.x).toBe(0);
    expect(unlocked.y).toBe(0);

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(unlocked.x).toBe(10);
    expect(unlocked.y).toBe(10);
  });

  it('moves groups and boards like normal shapes', async () => {
    const group = { id: 'g-1', name: 'Group', type: 'group', x: 50, y: 50 };
    const board = { id: 'b-1', name: 'Board', type: 'board', x: 0, y: 0 };

    (globalThis as any).penpot = {
      selection: [group, board],
      currentPage: {
        getShapeById: (id: string) => (id === group.id ? group : id === board.id ? board : null),
      },
    };

    const resp = await moveSelectionTool({ dx: -10, dy: -20 });
    expect(resp.success).toBeTruthy();
    expect(group.x).toBe(40);
    expect(group.y).toBe(30);
    expect(board.x).toBe(-10);
    expect(board.y).toBe(-20);

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(group.x).toBe(50);
    expect(group.y).toBe(50);
    expect(board.x).toBe(0);
    expect(board.y).toBe(0);

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(group.x).toBe(40);
    expect(group.y).toBe(30);
    expect(board.x).toBe(-10);
    expect(board.y).toBe(-20);
  });
});