import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findClonePlacement, Rect } from '../cloneHelpers';

describe('cloneHelpers.findClonePlacement - edge cases', () => {
  beforeEach(() => {
    // Install a test page with a known width/height so clampToPage is exercised
    // @ts-ignore - test runtime simulates penpot
    globalThis.penpot = { currentPage: { width: 200, height: 200, findShapes: () => [] } };
  });

  afterEach(() => {
    // @ts-ignore
    delete globalThis.penpot;
  });

  it('clamps clones to the right-edge when selection is near right edge', () => {
    const sel: Rect = { x: 160, y: 10, width: 50, height: 30 };
    // nothing on page, so placement will try to place right; expected clamp locks x to pageW - width
    const placed = findClonePlacement(sel, []);
    expect(placed.x).toBeGreaterThanOrEqual(0);
    expect(placed.x + placed.width).toBeLessThanOrEqual(200);
  });

  it('clamps clones to the bottom-edge when selection is near bottom edge', () => {
    const sel: Rect = { x: 10, y: 170, width: 40, height: 50 };
    const placed = findClonePlacement(sel, []);
    expect(placed.y).toBeGreaterThanOrEqual(0);
    expect(placed.y + placed.height).toBeLessThanOrEqual(200);
  });

  it('returns a non-colliding candidate when existing bounds block default directions', () => {
    const sel: Rect = { x: 10, y: 10, width: 30, height: 30 };
    // Block right and below immediate positions so function must find another spot
    const offsetX = Math.max(Math.round(sel.width * 0.06), 6);
    const offsetY = Math.max(Math.round(sel.height * 0.06), 6);
    const rightCandidate = { x: sel.x + sel.width + offsetX, y: sel.y + offsetY, width: sel.width, height: sel.height };
    const belowCandidate = { x: sel.x + offsetX, y: sel.y + sel.height + offsetY, width: sel.width, height: sel.height };

    const existing = [rightCandidate, belowCandidate];
    const placed = findClonePlacement(sel, existing, { maxAttempts: 2 });

    // Ensure the returned rect does not collide with existing
    const collides = existing.some(r => !(placed.x + placed.width <= r.x || placed.x >= r.x + r.width || placed.y + placed.height <= r.y || placed.y >= r.y + r.height));
    expect(collides).toBe(false);
  });

  it('last-resort placement remains on the page after many failed attempts', () => {
    const sel: Rect = { x: 0, y: 0, width: 50, height: 50 };
    // create many blocking rects to force exhaustion of attempts
    const existing: Rect[] = [];
    for (let i = 0; i < 10; i++) {
      existing.push({ x: sel.x + sel.width + i * (sel.width + 6), y: sel.y + 6, width: sel.width, height: sel.height });
    }
    const placed = findClonePlacement(sel, existing, { maxAttempts: 1 });
    expect(placed.x + placed.width).toBeLessThanOrEqual(200);
    expect(placed.y + placed.height).toBeLessThanOrEqual(200);
  });
});
