/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setLayerOrderTool } from '../mainHandlers';
import { ZIndexResponsePayload } from '@/types/types';

describe('setLayerOrderTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  describe('bring-to-front', () => {
    it('moves a shape to the front of its parent', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      const shape3 = { id: 's3', name: 'Shape 3' };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children,
        appendChild: vi.fn((shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
            children.push(shape);
          }
        }),
        insertChild: vi.fn(),
      };

      shape2.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape2],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2, shape3].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'bring-to-front' });
      
      expect(resp.success).toBeTruthy();
      expect(parent.appendChild).toHaveBeenCalledWith(shape2);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's2', name: 'Shape 2' }]);
      expect(payload.action).toBe('bring-to-front');
    });
  });

  describe('send-to-back', () => {
    it('moves a shape to the back of its parent', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      const shape3 = { id: 's3', name: 'Shape 3' };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn((index: number, shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
          }
          children.splice(index, 0, shape);
        }),
      };

      shape2.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape2],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2, shape3].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'send-to-back' });
      
      expect(resp.success).toBeTruthy();
      expect(parent.insertChild).toHaveBeenCalledWith(0, shape2);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's2', name: 'Shape 2' }]);
      expect(payload.action).toBe('send-to-back');
      expect(payload.targetIndex).toBe(0);
    });
  });

  describe('bring-forward', () => {
    it('moves a shape one position forward', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      const shape3 = { id: 's3', name: 'Shape 3' };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn((index: number, shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
          }
          children.splice(index, 0, shape);
        }),
      };

      shape1.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2, shape3].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'bring-forward' });
      
      expect(resp.success).toBeTruthy();
      expect(parent.insertChild).toHaveBeenCalledWith(1, shape1);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's1', name: 'Shape 1' }]);
      expect(payload.targetIndex).toBe(1);
    });

    it('does not move shape if already at front', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      
      const children = [shape1, shape2];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn(),
      };

      shape2.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape2],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'bring-forward' });
      
      expect(resp.success).toBeTruthy();
      // Should not call insertChild since shape is already at the end
      expect(parent.insertChild).not.toHaveBeenCalled();
    });
  });

  describe('send-backward', () => {
    it('moves a shape one position backward', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      const shape3 = { id: 's3', name: 'Shape 3' };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn((index: number, shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
          }
          children.splice(index, 0, shape);
        }),
      };

      shape3.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape3],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2, shape3].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'send-backward' });
      
      expect(resp.success).toBeTruthy();
      expect(parent.insertChild).toHaveBeenCalledWith(1, shape3);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's3', name: 'Shape 3' }]);
      expect(payload.targetIndex).toBe(1);
    });

    it('does not move shape if already at back', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      
      const children = [shape1, shape2];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn(),
      };

      shape1.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'send-backward' });
      
      expect(resp.success).toBeTruthy();
      // Should not call insertChild since shape is already at index 0
      expect(parent.insertChild).not.toHaveBeenCalled();
    });
  });

  describe('set-index', () => {
    it('moves a shape to a specific index', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      const shape3 = { id: 's3', name: 'Shape 3' };
      const shape4 = { id: 's4', name: 'Shape 4' };
      
      const children = [shape1, shape2, shape3, shape4];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn((index: number, shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
          }
          children.splice(index, 0, shape);
        }),
      };

      shape1.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2, shape3, shape4].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'set-index', index: 2 });
      
      expect(resp.success).toBeTruthy();
      expect(parent.insertChild).toHaveBeenCalledWith(2, shape1);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's1', name: 'Shape 1' }]);
      expect(payload.targetIndex).toBe(2);
    });

    it('clamps index to valid range', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      
      const children = [shape1, shape2];
      const parent = {
        children,
        appendChild: vi.fn(),
        insertChild: vi.fn(),
      };

      shape1.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2].find(s => s.id === id) || null,
        },
      };

      // Try to set index beyond array length
      const resp = await setLayerOrderTool({ action: 'set-index', index: 100 });
      
      expect(resp.success).toBeTruthy();
      // Should clamp to max index (1 in this case)
      expect(parent.insertChild).toHaveBeenCalledWith(1, shape1);
    });

    it('returns error if index not provided', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const parent = {
        children: [shape1],
        appendChild: vi.fn(),
        insertChild: vi.fn(),
      };

      shape1.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1],
      };

      const resp = await setLayerOrderTool({ action: 'set-index' });
      
      expect(resp.success).toBeFalsy();
      expect(resp.message).toContain('requires an index parameter');
    });
  });

  describe('multiple shapes', () => {
    it('moves multiple shapes', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      const shape3 = { id: 's3', name: 'Shape 3' };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children,
        appendChild: vi.fn((shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
            children.push(shape);
          }
        }),
        insertChild: vi.fn(),
      };

      shape1.parent = parent;
      shape2.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1, shape2],
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2, shape3].find(s => s.id === id) || null,
        },
      };

      const resp = await setLayerOrderTool({ action: 'bring-to-front' });
      
      expect(resp.success).toBeTruthy();
      expect(parent.appendChild).toHaveBeenCalledTimes(2);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toHaveLength(2);
      expect(payload.movedShapes).toContainEqual({ id: 's1', name: 'Shape 1' });
      expect(payload.movedShapes).toContainEqual({ id: 's2', name: 'Shape 2' });
    });
  });

  describe('error handling', () => {
    it('returns error when no selection', async () => {
      (globalThis as any).penpot = {
        selection: [],
      };

      const resp = await setLayerOrderTool({ action: 'bring-to-front' });
      
      expect(resp.success).toBeFalsy();
      expect(resp.message).toBe('NO_SELECTION');
    });

    it('handles shapes without parent gracefully', async () => {
      const shape1 = { id: 's1', name: 'Shape 1', parent: null };

      (globalThis as any).penpot = {
        selection: [shape1],
        currentPage: {
          getShapeById: (id: string) => (id === 's1' ? shape1 : null),
        },
      };

      const resp = await setLayerOrderTool({ action: 'bring-to-front' });
      
      expect(resp.success).toBeFalsy();
      expect(resp.message).toContain('No shapes could be reordered');
    });

    it('returns error for unknown action', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const parent = {
        children: [shape1],
        appendChild: vi.fn(),
        insertChild: vi.fn(),
      };

      shape1.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape1],
      };

      const resp = await setLayerOrderTool({ action: 'invalid-action' as any });
      
      expect(resp.success).toBeFalsy();
      expect(resp.message).toContain('Unknown action');
    });
  });

  describe('shapeIds parameter', () => {
    it('uses shapeIds parameter instead of selection', async () => {
      const shape1 = { id: 's1', name: 'Shape 1' };
      const shape2 = { id: 's2', name: 'Shape 2' };
      
      const children = [shape1, shape2];
      const parent = {
        children,
        appendChild: vi.fn((shape: any) => {
          const idx = children.indexOf(shape);
          if (idx !== -1) {
            children.splice(idx, 1);
            children.push(shape);
          }
        }),
        insertChild: vi.fn(),
      };

      shape1.parent = parent;
      shape2.parent = parent;

      (globalThis as any).penpot = {
        selection: [shape2], // Selection is shape2
        currentPage: {
          getShapeById: (id: string) => [shape1, shape2].find(s => s.id === id) || null,
        },
      };

      // But we specify shape1 in shapeIds
      const resp = await setLayerOrderTool({ 
        action: 'bring-to-front', 
        shapeIds: ['s1'] 
      });
      
      expect(resp.success).toBeTruthy();
      expect(parent.appendChild).toHaveBeenCalledWith(shape1);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's1', name: 'Shape 1' }]);
    });
  });
});
