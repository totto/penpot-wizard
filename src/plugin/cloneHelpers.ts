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

const DEFAULT_OFFSET = 10;

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
  const offsetX = Math.max(options.offsetX ?? DEFAULT_OFFSET, DEFAULT_OFFSET);
  const offsetY = Math.max(options.offsetY ?? DEFAULT_OFFSET, DEFAULT_OFFSET);
  const fallback = options.fallback ?? 'auto';
  const order = directionOrders[fallback];
  const maxAttempts = Math.max(options.maxAttempts ?? 6, 1);

  const width = normalized.width;
  const height = normalized.height;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (const direction of order) {
      const candidate = buildCandidateRect(normalized, direction, offsetX, offsetY, attempt, width, height);
      if (!collides(candidate, existingBounds)) {
        return candidate;
      }
    }
  }

  // Last-resort placement to the right with expanded offset
  return {
    x: normalized.x + width + offsetX + maxAttempts * (width + offsetX),
    y: normalized.y + offsetY,
    width,
    height,
  };
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
