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
  expect(moveResp.payload?.undoInfo).toBeDefined();
  const undoData: any = moveResp.payload?.undoInfo?.undoData;
  expect(undoData.previousPositions[0].x).toBe(10);

  const undoResp = await undoLastAction({});
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
});