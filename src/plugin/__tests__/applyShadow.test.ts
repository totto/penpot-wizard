/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { applyShadowTool } from '../mainHandlers';

describe('applyShadowTool handler', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('prompts for override when selected shapes already have shadows', async () => {
    const shapeWithShadow = {
      id: 's-shadow',
      name: 'HasShadow',
      shadows: [
        { style: 'drop-shadow', color: '#000000', offsetX: 1, offsetY: 1, blur: 2, spread: 0 }
      ],
    } as any;

    (globalThis as any).penpot = {
      selection: [shapeWithShadow],
    };

    const response = await applyShadowTool({ shadowColor: '#FF0000', shadowOffsetX: 2, shadowOffsetY: 3, shadowBlur: 5, shadowSpread: 0, overrideExisting: false });

    // Should not apply — should prompt
    expect(response.success).toBe(false);
    expect(response.message).toContain('already');

    // @ts-expect-error - union payload typing in test harness
    expect(Array.isArray(response.payload?.shapesWithExistingShadows)).toBe(true);
    // @ts-expect-error - union payload typing in test harness
    expect(response.payload?.shapesWithExistingShadows[0].id).toBe('s-shadow');

    // Check requestedShadow details
    // @ts-expect-error - union payload typing in test harness
    expect(response.payload?.requestedShadow).toBeDefined();
    // @ts-expect-error - union payload typing in test harness
    expect(response.payload?.requestedShadow.shadowColor).toBe('#FF0000');
    // @ts-expect-error - union payload typing in test harness
    expect(response.payload?.requestedShadow.shadowOffsetX).toBe(2);
  });

  it('applies the shadow when overrideExisting is true', async () => {
    const shapeWithShadow = {
      id: 's-shadow-2',
      name: 'HasShadow2',
      shadows: [
        { style: 'drop-shadow', color: '#000000', offsetX: 1, offsetY: 1, blur: 2, spread: 0 }
      ],
    } as any;

    (globalThis as any).penpot = {
      selection: [shapeWithShadow],
    };

    const response = await applyShadowTool({ shadowColor: '#00FF00', shadowOffsetX: 5, shadowOffsetY: 6, shadowBlur: 10, shadowSpread: 1, overrideExisting: true });

    expect(response.success).toBe(true);
    // @ts-expect-error - test harness union typing
    expect(Array.isArray(response.payload?.shadowedShapes)).toBe(true);
    // @ts-expect-error - test harness union typing
    expect(response.payload?.shadowedShapes[0]).toBe('HasShadow2');

    // Check that shape in the selection got a new shadow object applied
    expect(Array.isArray(shapeWithShadow.shadows)).toBe(true);
    expect(shapeWithShadow.shadows[0].color).toBe('#00FF00');
    expect(shapeWithShadow.shadows[0].offsetX).toBe(5);
    expect(shapeWithShadow.shadows[0].offsetY).toBe(6);
    expect(shapeWithShadow.shadows[0].blur).toBe(10);
    expect(shapeWithShadow.shadows[0].spread).toBe(1);
  });

});
