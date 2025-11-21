import type { Penpot, Shape } from '@penpot/plugin-types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PlacementFallback = 'auto' | 'right' | 'below' | 'left' | 'top';

export interface PlacementOptions {
  offsetX?: number;
  offsetY?: number;
  fallback?: PlacementFallback;
  maxAttempts?: number;
}

const DEFAULT_OFFSET = 1; // legacy default (used when caller explicitly sets offsets)
const MIN_OFFSET = 1; // minimum px offset to keep clones visually separated but on-board
const DEFAULT_OFFSET_RATIO = 0.06; // default offset as a fraction of selection size when caller doesn't provide one (smaller -> closer clones)
const DEFAULT_MAX_ATTEMPTS = 3; // fewer attempts before fallback to avoid huge offsets

function normalizeRect(rect: Rect): Rect {
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  return { x: rect.x, y: rect.y, width, height };
}

export function getSelectionBounds(shapes: Shape[]): Rect | null {
  if (!shapes || shapes.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const shape of shapes) {
    if (!shape) continue;
    const x = typeof shape.x === 'number' ? shape.x : 0;
    const y = typeof shape.y === 'number' ? shape.y : 0;
    const width = typeof shape.width === 'number' ? shape.width : 0;
    const height = typeof shape.height === 'number' ? shape.height : 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  if (minX === Number.POSITIVE_INFINITY || minY === Number.POSITIVE_INFINITY) {
    return null;
  }

  return normalizeRect({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
}

export function getPageBounds(excludeIds: Set<string>): Rect[] {
  const bounds: Rect[] = [];
  try {
    if (typeof penpot === 'undefined') {
      return bounds;
    }

    const page: Penpot['currentPage'] | null = penpot.currentPage ?? null;
    if (!page || typeof page.findShapes !== 'function') {
      return bounds;
    }

    const shapes: Shape[] = page.findShapes();
    for (const shape of shapes) {
      if (!shape || !shape.id || excludeIds.has(shape.id)) {
        continue;
      }
      const rect: Rect = {
        x: typeof shape.x === 'number' ? shape.x : 0,
        y: typeof shape.y === 'number' ? shape.y : 0,
        width: Math.max(typeof shape.width === 'number' ? shape.width : 0, 1),
        height: Math.max(typeof shape.height === 'number' ? shape.height : 0, 1),
      };
      bounds.push(rect);
    }
  } catch (err) {
    console.warn('Failed to collect page bounds for clone placement', err);
  }
  return bounds;
}

const directionOrders: Record<PlacementFallback, Array<'right' | 'below' | 'left' | 'top'>> = {
  auto: ['right', 'below', 'left', 'top'],
  right: ['right', 'below', 'left', 'top'],
  below: ['below', 'right', 'left', 'top'],
  left: ['left', 'below', 'right', 'top'],
  top: ['top', 'right', 'below', 'left'],
};

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.width <= b.x || a.x >= b.x + b.width || a.y + a.height <= b.y || a.y >= b.y + b.height);
}

function collides(candidate: Rect, existing: Rect[]): boolean {
  for (const rect of existing) {
    if (rectsOverlap(candidate, rect)) {
      return true;
    }
  }
  return false;
}

export function findClonePlacement(selectionRect: Rect, existingBounds: Rect[], options: PlacementOptions = {}): Rect {
  const normalized = normalizeRect(selectionRect);
  // If caller provided explicit offsets use them; otherwise choose a modest offset
  // based on a percentage of the selection size so clones stay near the original
  // but remain visually separated. Use a minimum to ensure visibility on very
  // small shapes.
  // width/height are defined further below — compute offsets after normalizing
  const fallback = options.fallback ?? 'auto';
  const order = directionOrders[fallback];
  const maxAttempts = Math.max(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, 1);

  const width = normalized.width;
  const height = normalized.height;

  const computedOffsetX = Math.max(Math.round(width * DEFAULT_OFFSET_RATIO), MIN_OFFSET);
  const computedOffsetY = Math.max(Math.round(height * DEFAULT_OFFSET_RATIO), MIN_OFFSET);
  const offsetX = typeof options.offsetX === 'number' ? options.offsetX : computedOffsetX;
  const offsetY = typeof options.offsetY === 'number' ? options.offsetY : computedOffsetY;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (const direction of order) {
      const candidate = buildCandidateRect(normalized, direction, offsetX, offsetY, attempt, width, height);
      if (!collides(candidate, existingBounds)) {
        return clampToPage(candidate);
      }
    }
  }

  // Last-resort placement to the right with small expansion; clamp to page bounds
  const lastX = normalized.x + width + offsetX + Math.min(maxAttempts, 3) * (width + offsetX);
  const lastY = normalized.y + offsetY;
  return clampToPage({ x: lastX, y: lastY, width, height });
}

/**
 * Clamp a candidate rect to page bounds when possible so clones remain on the page
 * and are visible to the user. If the page size isn't available, the rect is
 * returned unchanged.
 */
function clampToPage(candidate: Rect): Rect {
  try {
    const page = (penpot as unknown as Penpot)?.currentPage;
    // Try to read page bounds first (page objects in different runtimes may
    // omit typed width/height in tests). If page dims are not available, try
    // the viewport (host runtime may expose viewport.width/height). As a final
    // fallback use conservative default page dimensions so clones don't end up
    // at extremely large coordinates.
    const pageW = page && typeof (page as { width?: number }).width === 'number' ? (page as { width?: number }).width : undefined;
    const pageH = page && typeof (page as { height?: number }).height === 'number' ? (page as { height?: number }).height : undefined;

    let finalW = pageW;
    let finalH = pageH;

    if (typeof finalW !== 'number' || typeof finalH !== 'number') {
      try {
        const viewport = (globalThis as unknown as { penpot?: { viewport?: { width?: number; height?: number } } }).penpot?.viewport;
        if (typeof finalW !== 'number' && viewport && typeof viewport.width === 'number') finalW = viewport.width;
        if (typeof finalH !== 'number' && viewport && typeof viewport.height === 'number') finalH = viewport.height;
      } catch {
        // ignore viewport read errors
      }
    }

    // last-resort defaults (safe, large enough to keep clones reasonable)
    const FALLBACK_PAGE_WIDTH = 1000;
    const FALLBACK_PAGE_HEIGHT = 1000;
    finalW = typeof finalW === 'number' ? finalW : FALLBACK_PAGE_WIDTH;
    finalH = typeof finalH === 'number' ? finalH : FALLBACK_PAGE_HEIGHT;

    // Keep a small padding so clones are not flush with the edge
    const PADDING = 6;

    // clamp to computed finalW/finalH, respect padding so clones remain visible
    const maxX = Math.max(0, Math.floor(finalW - candidate.width - PADDING));
    const maxY = Math.max(0, Math.floor(finalH - candidate.height - PADDING));
    candidate.x = Math.min(Math.max(candidate.x, PADDING), maxX);
    candidate.y = Math.min(Math.max(candidate.y, PADDING), maxY);
  } catch {
    // Ignore - can't clamp without page info
  }
  return candidate;
}

function buildCandidateRect(
  selection: Rect,
  direction: 'right' | 'below' | 'left' | 'top',
  offsetX: number,
  offsetY: number,
  attempt: number,
  width: number,
  height: number,
): Rect {
  const horizontalStep = offsetX + width;
  const verticalStep = offsetY + height;

  switch (direction) {
    case 'right':
      return {
        x: selection.x + selection.width + offsetX + attempt * horizontalStep,
        y: selection.y + offsetY,
        width,
        height,
      };
    case 'below':
      return {
        x: selection.x + offsetX,
        y: selection.y + selection.height + offsetY + attempt * verticalStep,
        width,
        height,
      };
    case 'left':
      return {
        x: selection.x - width - offsetX - attempt * horizontalStep,
        y: selection.y + offsetY,
        width,
        height,
      };
    case 'top':
      return {
        x: selection.x + offsetX,
        y: selection.y - height - offsetY - attempt * verticalStep,
        width,
        height,
      };
    default:
      return {
        x: selection.x + selection.width + offsetX,
        y: selection.y + offsetY,
        width,
        height,
      };
  }
}

export function unionRects(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.max(a.x + a.width, b.x + b.width) - x;
  const height = Math.max(a.y + a.height, b.y + b.height) - y;
  return { x, y, width: Math.max(width, 1), height: Math.max(height, 1) };
}
