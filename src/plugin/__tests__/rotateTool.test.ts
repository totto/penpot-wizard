/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { rotateTool } from '../mainHandlers';

describe('rotateTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('rotates shapes and returns payload when selection present', async () => {
    (globalThis as any).penpot = {
      selection: [
        { id: 's1', name: 'Rect', type: 'rectangle', rotation: 0, rotate: function(a:number) { this.rotation = (this.rotation || 0) + a; } }
      ]
    };

    const response = await rotateTool({ angle: 90 });
    expect(response.success).not.toBe(false);
    expect(response.payload).toBeDefined();
    // @ts-expect-error - typed payload union doesn't include RotateResponsePayload in this test harness
    expect(response.payload.rotatedShapes.length).toBeGreaterThan(0);
  });

  it('returns selection info in payload when angle missing and selection empty but currentPage.getSelectedShapes available', async () => {
    (globalThis as any).penpot = {
      selection: undefined,
      currentPage: {
        getSelectedShapes: () => [ { id: 's2', name: 'Circle', type: 'ellipse', x: 0, y: 0, width: 50, height: 50 } ]
      }
    };

    const response = await rotateTool({});
    expect(response.success).toBe(false);
    // @ts-expect-error - tests know this payload shape
    expect(Array.isArray(response.payload?.currentSelectionInfo)).toBe(true);
  });
});
