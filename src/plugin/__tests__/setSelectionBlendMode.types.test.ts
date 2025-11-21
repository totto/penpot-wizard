/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';
import { setSelectionBlendModeTool, undoLastAction, redoLastAction } from '../mainHandlers';

describe('setSelectionBlendModeTool - element type coverage', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
  });

  it('applies blend mode to an image-like element', async () => {
    const image = { id: 'img-1', name: 'Image Element', backgroundImage: 'img-asset', blendMode: 'normal' };
    (globalThis as any).penpot = {
      selection: [image],
      currentPage: { getShapeById: (id: string) => (id === image.id ? image : null) },
    };

    const resp = await setSelectionBlendModeTool({ blendMode: 'overlay' });
    expect(resp.success).not.toBe(false);
    expect(image.blendMode).toBe('overlay');

    await undoLastAction({});
    expect(image.blendMode).toBe('normal');

    await redoLastAction({});
    expect(image.blendMode).toBe('overlay');
  });

  it('applies blend mode to a path element', async () => {
    const path = { id: 'path-1', name: 'Path Element', content: [{ command: 'M' }], blendMode: 'normal' };
    (globalThis as any).penpot = {
      selection: [path],
      currentPage: { getShapeById: (id: string) => (id === path.id ? path : null) },
    };

    const resp = await setSelectionBlendModeTool({ blendMode: 'screen' });
    expect(resp.success).not.toBe(false);
    expect(path.blendMode).toBe('screen');

    await undoLastAction({});
    expect(path.blendMode).toBe('normal');
  });

  it('applies blend mode to a group object and a board', async () => {
    const group = { id: 'g-1', name: 'Group Element', children: ['c1', 'c2'], blendMode: undefined };
    const board = { id: 'board-1', name: 'Board Element', width: 100, height: 100, blendMode: 'normal' };

    (globalThis as any).penpot = {
      selection: [group, board],
      currentPage: { getShapeById: (id: string) => (id === group.id ? group : id === board.id ? board : null) },
    };

    const resp = await setSelectionBlendModeTool({ blendMode: 'multiply' });
    // should succeed and apply to both selected objects (group and board)
    expect(resp.success).not.toBe(false);
    expect(group.blendMode).toBe('multiply');
    expect(board.blendMode).toBe('multiply');

    // undo should restore prior states (group had undefined -> restored to undefined, board was 'normal')
    await undoLastAction({});
    expect(group.blendMode).toBeUndefined();
    expect(board.blendMode).toBe('normal');
  });

  it('skips locked items in mixed selection', async () => {
    const unlocked = { id: 'u-1', name: 'Unlocked', blendMode: 'normal' };
    const locked = { id: 'l-1', name: 'Locked', blendMode: 'normal', locked: true };

    (globalThis as any).penpot = {
      selection: [unlocked, locked],
      currentPage: { getShapeById: (id: string) => (id === unlocked.id ? unlocked : id === locked.id ? locked : null) },
    };

    const resp = await setSelectionBlendModeTool({ blendMode: 'color-burn' });
    // Should apply to unlocked only
    expect(resp.success).not.toBe(false);
    expect(unlocked.blendMode).toBe('color-burn');
    expect(locked.blendMode).toBe('normal');

    // undo should restore the unlocked element only
    await undoLastAction({});
    expect(unlocked.blendMode).toBe('normal');
    expect(locked.blendMode).toBe('normal');
  });
});
