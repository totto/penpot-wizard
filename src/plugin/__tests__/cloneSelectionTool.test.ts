/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  cloneSelectionTool,
  undoLastAction,
  redoLastAction,
  resetUndoRedoStacks,
} from '../mainHandlers';
import type { CloneSelectionResponsePayload, CloneSelectionPromptResponsePayload } from '@/types/types';

describe('cloneSelectionTool', () => {
  const originalPenpot = (globalThis as any).penpot;
  let pageShapes: any[];
  let cloneCounter = 0;

  const buildPage = () => ({
    findShapes: () => pageShapes,
    getShapeById: (id: string) => pageShapes.find(shape => shape.id === id) ?? null,
  });

  const createShape = (id: string, overrides: Partial<any> = {}): any => {
    const shape: any = {
      id,
      name: overrides.name ?? id,
      x: typeof overrides.x === 'number' ? overrides.x : 0,
      y: typeof overrides.y === 'number' ? overrides.y : 0,
      width: typeof overrides.width === 'number' ? overrides.width : 20,
      height: typeof overrides.height === 'number' ? overrides.height : 20,
      locked: Boolean(overrides.locked),
      visible: typeof overrides.visible === 'boolean' ? overrides.visible : true,
      type: overrides.type ?? 'rectangle',
    };

    shape.remove = () => {
      const index = pageShapes.findIndex(item => item.id === shape.id);
      if (index >= 0) {
        pageShapes.splice(index, 1);
      }
    };

    shape.clone = () => {
      const cloneId = `clone-${++cloneCounter}-${shape.id}`;
      const clone = createShape(cloneId, {
        name: `${shape.name}-clone`,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        locked: shape.locked,
        visible: shape.visible,
        type: shape.type,
      });
      pageShapes.push(clone);
      return clone;
    };

    return shape;
  };

  const addShapeToPage = (id: string, overrides: Partial<any> = {}) => {
    const shape = createShape(id, overrides);
    pageShapes.push(shape);
    return shape;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cloneCounter = 0;
    pageShapes = [];
    (globalThis as any).penpot = {
      selection: [],
      currentPage: buildPage(),
    };
  });

  afterEach(() => {
    resetUndoRedoStacks();
    (globalThis as any).penpot = originalPenpot;
  });

  it('duplicates unlocked shapes and supports undo/redo', async () => {
    const source = addShapeToPage('shape-1', { x: 80, y: 40 });
    (globalThis as any).penpot.selection = [source];

    const response = await cloneSelectionTool({ offset: { x: 15, y: 15 } });
    expect(response.success).toBeTruthy();

    const payload = response.payload as CloneSelectionResponsePayload | undefined;
    expect(payload?.createdIds).toHaveLength(1);
    expect(pageShapes).toHaveLength(2);

    const cloneId = payload!.createdIds[0];
    const clone = pageShapes.find(shape => shape.id === cloneId);
    expect(clone).toBeDefined();
    expect(clone?.id).not.toBe(source.id);

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(pageShapes).toHaveLength(1);
    expect(pageShapes[0].id).toBe(source.id);

    const redoResp = await redoLastAction({});
    expect(redoResp.success).toBeTruthy();
    expect(pageShapes).toHaveLength(2);
    expect(pageShapes.some(shape => shape.id !== source.id)).toBeTruthy();
  });

  it('skips locked shapes when skipLocked is true', async () => {
    const locked = addShapeToPage('shape-locked', { locked: true, x: 5 });
    const unlocked = addShapeToPage('shape-open', { x: 60 });
    (globalThis as any).penpot.selection = [locked, unlocked];

    const response = await cloneSelectionTool({ skipLocked: true });
    expect(response.success).toBeTruthy();
    const payload = response.payload as CloneSelectionResponsePayload | undefined;
    expect(payload?.createdIds).toHaveLength(1);
    const clone = pageShapes.find(shape => shape.id === payload!.createdIds[0]);
    expect(clone).toBeDefined();
    expect(clone?.locked).toBe(false);
    expect(pageShapes).toHaveLength(3);

    const undoResp = await undoLastAction({});
    expect(undoResp.success).toBeTruthy();
    expect(pageShapes).toHaveLength(2);
    expect(pageShapes.map(shape => shape.id)).toEqual(expect.arrayContaining([locked.id, unlocked.id]));
  });

  it('prompts when locked shapes would block cloning and skipLocked is false', async () => {
    const locked = addShapeToPage('shape-locked', { locked: true });
    (globalThis as any).penpot.selection = [locked];

    const response = await cloneSelectionTool({ skipLocked: false });
    expect(response.success).toBeFalsy();

    const payload = response.payload as CloneSelectionPromptResponsePayload | undefined;
    expect(payload?.lockedShapes).toEqual([{ id: locked.id, name: locked.name }]);
    expect(payload?.selectionCount).toBe(1);
  });
});
