/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setLayoutZIndexTool } from '../mainHandlers';
import { ZIndexResponsePayload } from '@/types/types';

describe('setLayoutZIndexTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  describe('bring-to-front', () => {
    it('moves a shape to the front of its parent', async () => {
      const shape1 = { id: 's1', name: 'Shape 1', layoutChild: { zIndex: 1 } };
      const shape2 = { id: 's2', name: 'Shape 2', layoutChild: { zIndex: 2 } };
      const shape3 = { id: 's3', name: 'Shape 3', layoutChild: { zIndex: 3 } };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children, flex: true,
        flex: true,
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

      const resp = await setLayoutZIndexTool({ action: 'bring-to-front' });
      
      expect(resp.success).toBeTruthy();
      expect(shape2.layoutChild.zIndex).toBe(4);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's2', name: 'Shape 2', newZIndex: 4 }]);
      expect(payload.action).toBe('bring-to-front');
    });
  });

  describe('send-to-back', () => {
    it('moves a shape to the back of its parent', async () => {
      const shape1 = { id: 's1', name: 'Shape 1', layoutChild: { zIndex: 1 } };
      const shape2 = { id: 's2', name: 'Shape 2', layoutChild: { zIndex: 2 } };
      const shape3 = { id: 's3', name: 'Shape 3', layoutChild: { zIndex: 3 } };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children, flex: true,
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

      const resp = await setLayoutZIndexTool({ action: 'send-to-back' });
      
      expect(resp.success).toBeTruthy();
      expect(shape2.layoutChild.zIndex).toBe(0);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's2', name: 'Shape 2', newZIndex: 0 }]);
      expect(payload.action).toBe('send-to-back');
    });
  });

  describe('bring-forward', () => {
    it('moves a shape one position forward', async () => {
      const shape1 = { id: 's1', name: 'Shape 1', layoutChild: { zIndex: 1 } };
      const shape2 = { id: 's2', name: 'Shape 2', layoutChild: { zIndex: 2 } };
      const shape3 = { id: 's3', name: 'Shape 3', layoutChild: { zIndex: 3 } };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children, flex: true,
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

      const resp = await setLayoutZIndexTool({ action: 'bring-forward' });
      
      expect(resp.success).toBeTruthy();
      expect(shape1.layoutChild.zIndex).toBe(2);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's1', name: 'Shape 1', newZIndex: 2 }]);
    });
  });

  describe('send-backward', () => {
    it('moves a shape one position backward', async () => {
      const shape1 = { id: 's1', name: 'Shape 1', layoutChild: { zIndex: 1 } };
      const shape2 = { id: 's2', name: 'Shape 2', layoutChild: { zIndex: 2 } };
      const shape3 = { id: 's3', name: 'Shape 3', layoutChild: { zIndex: 3 } };
      
      const children = [shape1, shape2, shape3];
      const parent = {
        children, flex: true,
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

      const resp = await setLayoutZIndexTool({ action: 'send-backward' });
      
      expect(resp.success).toBeTruthy();
      expect(shape3.layoutChild.zIndex).toBe(2);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's3', name: 'Shape 3', newZIndex: 2 }]);
    });
  });

  describe('set-index', () => {
    it('moves a shape to a specific index', async () => {
      const shape1 = { id: 's1', name: 'Shape 1', layoutChild: { zIndex: 1 } };
      const shape2 = { id: 's2', name: 'Shape 2', layoutChild: { zIndex: 2 } };
      const shape3 = { id: 's3', name: 'Shape 3', layoutChild: { zIndex: 3 } };
      const shape4 = { id: 's4', name: 'Shape 4', layoutChild: { zIndex: 4 } };
      
      const children = [shape1, shape2, shape3, shape4];
      const parent = {
        children, flex: true,
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

      const resp = await setLayoutZIndexTool({ action: 'set-index', index: 2 });
      
      expect(resp.success).toBeTruthy();
      expect(shape1.layoutChild.zIndex).toBe(2);
      
      const payload = resp.payload as ZIndexResponsePayload;
      expect(payload.movedShapes).toEqual([{ id: 's1', name: 'Shape 1', newZIndex: 2 }]);
    });
  });
});
