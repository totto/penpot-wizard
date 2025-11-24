/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { resizeTool } from '../mainHandlers';

describe('resizeTool', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('resizes shapes and returns payload when selection present', async () => {
    (globalThis as any).penpot = {
      selection: [
        { id: 's1', name: 'Rect', type: 'rectangle', width: 10, height: 20, resize: function(w:number,h:number) { this.width=w; this.height=h; } }
      ]
    };

    const response = await resizeTool({ scaleX: 2 });
    expect(response.success).not.toBe(false);
    expect(response.payload).toBeDefined();
  // @ts-expect-error - typed payload union doesn't include ResizeResponsePayload in this test harness
  expect(response.payload.resizedShapes.length).toBeGreaterThan(0);
  });

  it('returns selection info in payload when selection is empty but currentPage.getSelectedShapes available', async () => {
    (globalThis as any).penpot = {
      selection: undefined,
      currentPage: {
        getSelectedShapes: () => [ { id: 's2', name: 'Circle', type: 'ellipse', x: 0, y: 0, width: 50, height: 50 } ]
      }
    };

    const response = await resizeTool({ scaleX: 1.5 });
    expect(response.success).toBe(false);
  // @ts-expect-error - typed payload union doesn't include currentSelectionInfo here
  expect(Array.isArray(response.payload?.currentSelectionInfo)).toBe(true);
  // @ts-expect-error - typed payload union doesn't include currentSelectionInfo here
  expect(response.payload?.currentSelectionInfo[0].width).toBe(50);
  });

  it('respects shape.proportionLock when only scaleY provided', async () => {
    (globalThis as any).penpot = {
      selection: [
        { id: 'rs1', name: 'Rect', type: 'rectangle', width: 40, height: 20, proportionLock: true, resize: function(w:number,h:number) { this.width=w; this.height=h; } }
      ]
    };

    const response = await resizeTool({ scaleY: 0.5, maintainAspectRatio: false });
    expect(response.success).not.toBe(false);
    // ensure both width and height were scaled because shape had proportionLock
    // @ts-expect-error - typed payload union doesn't include ResizeResponsePayload in this test harness
    expect(response.payload.resizedShapes.length).toBeGreaterThan(0);
    const s = (globalThis as any).penpot.selection[0];
    expect(s.width).toBeCloseTo(20);
    expect(s.height).toBeCloseTo(10);
  });

  it('respects constraints.proportionLock when only scaleX provided', async () => {
    (globalThis as any).penpot = {
      selection: [
        { id: 'rs2', name: 'Rect2', type: 'rectangle', width: 100, height: 50, constraints: { proportionLock: true }, resize: function(w:number,h:number) { this.width=w; this.height=h; } }
      ]
    };

    const response = await resizeTool({ scaleX: 0.5, maintainAspectRatio: false });
    expect(response.success).not.toBe(false);
    const s = (globalThis as any).penpot.selection[0];
    expect(s.width).toBeCloseTo(50);
    expect(s.height).toBeCloseTo(25);
  });
});
