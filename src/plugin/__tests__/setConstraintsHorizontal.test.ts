// Automated tests for set-constraints-horizontal tool
import { describe, it, expect, beforeEach } from 'vitest';
import { setConstraintsHorizontalTool, undoLastAction, redoLastAction, resetUndoRedoStacks } from '../mainHandlers';

// Helper to create a mock Penpot environment
function mockPenpot(shape) {
  (globalThis as any).penpot = {
    currentPage: {
      getShapeById: (id: string) => (id === shape.id ? shape : null),
    },
    selection: [shape],
  };
}

describe('setConstraintsHorizontalTool', () => {
  beforeEach(() => {
    resetUndoRedoStacks();
  });

  it('applies a valid horizontal constraint and supports undo/redo', async () => {
    const shape = { id: 'shape-1', constraintsHorizontal: 'left' } as any;
    mockPenpot(shape);

    const response = await setConstraintsHorizontalTool({ constraint: 'right' });
    expect(response.success).toBe(true);
    expect(shape.constraintsHorizontal).toBe('right');
    expect(response.payload?.updatedShapeIds).toContain('shape-1');

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBe(true);
    expect(shape.constraintsHorizontal).toBe('left');

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBe(true);
    expect(shape.constraintsHorizontal).toBe('right');
  });

  it('rejects unsupported horizontal constraints', async () => {
    const shape = { id: 'shape-2', constraintsHorizontal: 'left' } as any;
    mockPenpot(shape);

    const response = await setConstraintsHorizontalTool({ constraint: 'invalid' as any });
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/Unsupported constraint/);
  });

  it('returns NO_SELECTION when nothing is selected', async () => {
    (globalThis as any).penpot = { selection: [], currentPage: { getShapeById: () => null } };
    const response = await setConstraintsHorizontalTool({ constraint: 'right' });
    expect(response.success).toBe(false);
    expect(response.message).toBe('NO_SELECTION');
  });
});
