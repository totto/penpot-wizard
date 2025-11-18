/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ungroupTool } from '../mainHandlers';

describe('ungroupTool handler', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
    vi.restoreAllMocks();
  });

  it('returns NO_SELECTION when nothing is selected', async () => {
    (globalThis as any).penpot = { selection: [] };

    const response = await ungroupTool({});
    expect(response.success).toBe(false);
    expect(response.message).toContain('NO_SELECTION');
  });

  it('returns NO_GROUPS_SELECTED when there are no group shapes', async () => {
    (globalThis as any).penpot = {
      selection: [{ id: 's1', name: 'Shape' }],
      utils: { types: { isGroup: () => false } },
    };

    const response = await ungroupTool({});
    expect(response.success).toBe(false);
    expect(response.message).toContain('NO_GROUPS_SELECTED');
  });

  it('ungroups selected groups and returns ungroupedGroups in payload', async () => {
    const child1 = { id: 'c1', x: 10, y: 20 };
    const child2 = { id: 'c2', x: 30, y: 40 };
    const group = {
      id: 'g1',
      name: 'Group 1',
      children: [child1, child2],
    };

    const mockUngroup = vi.fn();

    (globalThis as any).penpot = {
      selection: [group],
      utils: { types: { isGroup: (s: any) => s && s.id === 'g1' } },
      ungroup: mockUngroup,
    };

    const response = await ungroupTool({});
    expect(response.success).toBe(true);
    // payload type is typed in union — check for ungroupedGroups
    // @ts-expect-error - union payload in tests
    expect(Array.isArray(response.payload?.ungroupedGroups)).toBe(true);
    // verify mapping
  // @ts-expect-error - union payload typed; tests assume this branch returns UngroupResponsePayload
  expect(response.payload?.ungroupedGroups[0].id).toBe('g1');
    // Check that penpot.ungroup was invoked
    expect(mockUngroup).toHaveBeenCalledWith(group);
  });

  it('ungroups multiple groups', async () => {
    const g1 = { id: 'g1', name: 'Group One', children: [{ id: 'g1c1', x: 1, y: 2 }] };
    const g2 = { id: 'g2', name: 'Group Two', children: [{ id: 'g2c1', x: 5, y: 6 }, { id: 'g2c2', x: 7, y: 8 }] };
    const mockUngroup = vi.fn();

    (globalThis as any).penpot = {
      selection: [g1, g2],
      utils: { types: { isGroup: (s: any) => s && (s.id === 'g1' || s.id === 'g2') } },
      ungroup: mockUngroup,
    };

    const response = await ungroupTool({});
    expect(response.success).toBe(true);
    // @ts-expect-error - union payload typed; tests assume this branch returns UngroupResponsePayload
    expect(response.payload?.ungroupedGroups.length).toBe(2);
    expect(mockUngroup).toHaveBeenCalledTimes(2);
    // @ts-expect-error - union payload
    expect(response.payload?.ungroupedGroups.map((g: any) => g.id)).toEqual(['g1', 'g2']);
  });

  it('handles group with no children', async () => {
    const emptyGroup = { id: 'g-empty', name: 'Empty Group', children: [] };
    const mockUngroup = vi.fn();

    (globalThis as any).penpot = {
      selection: [emptyGroup],
      utils: { types: { isGroup: (s: any) => s && s.id === 'g-empty' } },
      ungroup: mockUngroup,
    };

    const response = await ungroupTool({});
    expect(response.success).toBe(true);
    // @ts-expect-error - union payload typed; tests assume this branch returns UngroupResponsePayload
    expect(response.payload?.ungroupedGroups.length).toBe(1);
    // @ts-expect-error - union payload
    expect(response.payload?.ungroupedGroups[0].id).toBe('g-empty');
    expect(mockUngroup).toHaveBeenCalledWith(emptyGroup);
  });

  it('fails gracefully when penpot.ungroup throws', async () => {
    const group = { id: 'g-throws', name: 'Bad Group', children: [{ id: 'c1', x: 0, y: 0 }] };
    const mockUngroup = vi.fn().mockImplementation(() => { throw new Error('random'); });

    (globalThis as any).penpot = {
      selection: [group],
      utils: { types: { isGroup: (s: any) => s && s.id === 'g-throws' } },
      ungroup: mockUngroup,
    };

    const response = await ungroupTool({});
    expect(response.success).toBe(false);
    expect(response.message).toContain("Failed to ungroup shapes");
  });
});
