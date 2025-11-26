// Automated tests for set-constraints-vertical tool
import { describe, it, expect, beforeEach } from 'vitest';
import { setConstraintsVerticalTool, undoLastAction, redoLastAction, resetUndoRedoStacks } from '../mainHandlers';

// Helper to mock Penpot environment
function mockPenpot(shape) {
  (globalThis as any).penpot = {
    currentPage: {
      getShapeById: (id: string) => (id === shape.id ? shape : null),
    },
    selection: [shape],
  };
}

describe('setConstraintsVerticalTool', () => {
  beforeEach(() => {
    resetUndoRedoStacks();
  });

  it('applies a valid vertical constraint and supports undo/redo', async () => {
    const shape = { id: 'shape-v-1', constraintsVertical: 'top' } as any;
    mockPenpot(shape);

    const response = await setConstraintsVerticalTool({ constraint: 'bottom' });
    expect(response.success).toBe(true);
    expect(shape.constraintsVertical).toBe('bottom');
    expect(response.payload?.updatedShapeIds).toContain('shape-v-1');

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBe(true);
    expect(shape.constraintsVertical).toBe('top');

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBe(true);
    expect(shape.constraintsVertical).toBe('bottom');
  });

  it('rejects unsupported vertical constraints', async () => {
    const shape = { id: 'shape-v-2', constraintsVertical: 'top' } as any;
    mockPenpot(shape);

    const response = await setConstraintsVerticalTool({ constraint: 'invalid' as any });
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/Unsupported constraint/);
  });

  it('returns NO_SELECTION when nothing is selected', async () => {
    (globalThis as any).penpot = { selection: [], currentPage: { getShapeById: () => null } };
    const response = await setConstraintsVerticalTool({ constraint: 'bottom' });
    expect(response.success).toBe(false);
    expect(response.message).toBe('NO_SELECTION');
  });
});
