import { describe, it, expect, vi } from 'vitest';
import * as FT from '../functionTools';
import { sendMessageToPlugin } from '../../utils/pluginUtils';

vi.mock('@/utils/pluginUtils', () => ({
  sendMessageToPlugin: vi.fn(),
}));

describe('functionTools resize-selection behavior', () => {
  it('calls GET_SELECTION_INFO when no scale factors provided', async () => {
    // Find the tool
    const tool = FT.functionTools.find(t => t.id === 'resize-selection');
    if (!tool) throw new Error('resize-selection tool not found');

    // Mock GET_SELECTION_INFO response
  (sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ payload: { selectedObjects: [{ id: 's1', width: 10, height: 20 }] } });

  const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>)({});
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
  // @ts-expect-error payload typing is union - assert fields here
  expect(resp.payload.selectedObjects[0].width).toBe(10);
  });

  it('calls ADD_IMAGE_FROM_URL when add-image-from-url used', async () => {
    const tool = FT.functionTools.find(t => t.id === 'add-image-from-url');
    if (!tool) throw new Error('add-image-from-url tool not found');

    const args = { name: 'testimage', url: 'https://example.com/image.png' };
  const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
  sendMock.mockResolvedValueOnce({ success: true, payload: { newImageData: { id: 'img1' }, shapeId: 'shape1' } });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>)(args);
    expect(sendMessageToPlugin).toHaveBeenCalledWith('ADD_IMAGE_FROM_URL', args);
    expect(resp.success).toBe(true);
  });

  it('calls RESIZE when scale factors present', async () => {
    const tool = FT.functionTools.find(t => t.id === 'resize-selection');
    if (!tool) throw new Error('resize-selection tool not found');

  // @ts-expect-error test mocking
  (sendMessageToPlugin as unknown as jest.Mock).mockResolvedValueOnce({ success: true });
  const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>)({ scaleX: 1.5 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('RESIZE', { scaleX: 1.5 });
    expect(resp.success).toBe(true);
  });

  it('move-selection surfaces skipped locked shapes in message', async () => {
    const tool = FT.functionTools.find(t => t.id === 'move-selection');
    if (!tool) throw new Error('move-selection tool not found');

  const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
  // First call returns selection info for a single selected shape
  sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 'locked', name: 'Locked' }] } });
  // Next call returns MOVE response with skipped locked
  sendMock.mockResolvedValueOnce({ success: true, payload: { skippedLockedNames: ['Locked'] } });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>)({ dx: 10, dy: 10 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('MOVE', { dx: 10, dy: 10 });
    expect((resp.payload as unknown as { skippedLockedNames?: string[] })?.skippedLockedNames).toEqual(['Locked']);
  // Tailored message for single locked shape when only one selected
  // Accept flexible wording: it should mention it couldn't move and offer unlock instructions
  expect(resp.message).toMatch(/locked/i);
  expect(resp.message).toMatch(/unlock/i);
  });

  it('move-selection tailors message when one selected shape is locked among many', async () => {
    const tool = FT.functionTools.find(t => t.id === 'move-selection');
    if (!tool) throw new Error('move-selection tool not found');

  const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
  // First call returns selection info that says 3 shapes were selected
  sendMock.mockResolvedValueOnce({ payload: { selectionCount: 3, selectedObjects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'Locked' }, { id: 'c', name: 'C' }] } });
  // Next call returns MOVE response with a skipped locked shape
  sendMock.mockResolvedValueOnce({ success: true, payload: { skippedLockedNames: ['Locked'] }, message: 'Moved 0 shapes' });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>)({ dx: 0, dy: 0 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('MOVE', { dx: 0, dy: 0 });
    expect((resp.payload as unknown as { skippedLockedNames?: string[] })?.skippedLockedNames).toEqual(['Locked']);
    expect(resp.message).toContain('One of the selected shapes, Locked, is locked and was skipped');
  });

  it('move-selection handles multiple locked shapes gracefully', async () => {
    const tool = FT.functionTools.find(t => t.id === 'move-selection');
    if (!tool) throw new Error('move-selection tool not found');

  const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
  // First call returns selection info with multiple objects selected
  sendMock.mockResolvedValueOnce({ payload: { selectionCount: 4, selectedObjects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }] } });
  // Next call returns MOVE response with multiple locked shapes skipped
  sendMock.mockResolvedValueOnce({ success: true, payload: { skippedLockedNames: ['A', 'B'] }, message: 'Moved 2 shapes' });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>)({ dx: 5, dy: 5 });
    expect((resp.payload as unknown as { skippedLockedNames?: string[] })?.skippedLockedNames).toEqual(['A', 'B']);
    expect(resp.message).toContain('The following shapes are locked and were skipped: A, B');
  });

  it('toggle-selection-lock returns selection info when called without args', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-lock');
  if (!tool) throw new Error('toggle-selection-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a' }, { id: 'b' }] } });

  const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)();
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    // @ts-expect-error ensure payload fields exist
    expect(resp.payload.selectedObjects.length).toBe(2);
  });

  it('toggle-selection-lock surfaces mixed selection prompt', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-lock');
  if (!tool) throw new Error('toggle-selection-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockReset();
    // read selection first
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] } });
  // TOGGLE_SELECTION_LOCK returns mixed selection info
    sendMock.mockResolvedValueOnce({ success: false, message: 'MIXED_SELECTION', payload: { lockedShapes: [{ id: 'a', name: 'A' }], unlockedShapes: [{ id: 'b', name: 'B' }] } });

  const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({});
  expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_LOCK', { shapeIds: ['a', 'b'] });
    expect(resp.message).toMatch(/Locked: A/);
    expect(resp.message).toMatch(/Unlocked: B/);
  });

  it('toggle-selection-visibility returns selection info when called without args', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-visibility');
    if (!tool) throw new Error('toggle-selection-visibility tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a' }, { id: 'b' }] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)();
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    // @ts-expect-error ensure payload fields exist
    expect(resp.payload.selectedObjects.length).toBe(2);
  });

  it('toggle-selection-visibility surfaces mixed selection prompt', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-visibility');
    if (!tool) throw new Error('toggle-selection-visibility tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // read selection first
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] } });
    // TOGGLE_SELECTION_VISIBILITY returns mixed selection info
    sendMock.mockResolvedValueOnce({ success: false, message: 'MIXED_SELECTION', payload: { hiddenShapes: [{ id: 'a', name: 'A' }], unhiddenShapes: [{ id: 'b', name: 'B' }] } });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({});
    expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_VISIBILITY', { shapeIds: ['a', 'b'] });
    expect(resp.message).toMatch(/Hidden: A/);
    expect(resp.message).toMatch(/Visible: B/);
  });

  it('toggle-selection-visibility can hide shapes when hide=true', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-visibility');
    if (!tool) throw new Error('toggle-selection-visibility tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // first call read selection
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 'a', name: 'A' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { hiddenShapes: [{ id: 'a', name: 'A' }] }, message: 'Hidden 1 shape' });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({ hide: true });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_VISIBILITY', { hide: true, shapeIds: ['a'] });
    expect((resp.payload as unknown as { hiddenShapes?: Array<{ id: string }>} )?.hiddenShapes).toEqual([{ id: 'a', name: 'A' }]);
  });

  it('toggle-selection-lock can lock shapes when lock=true', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-lock');
  if (!tool) throw new Error('toggle-selection-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // First call is not used but wrapper should still call GET_SELECTION_INFO
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 'a', name: 'A' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { lockedShapes: [{ id: 'a', name: 'A' }] }, message: 'Locked 1 shape' });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({ lock: true });
  expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_LOCK', { lock: true, shapeIds: ['a'] });
    expect((resp.payload as unknown as { lockedShapes?: Array<{ id: string }>} )?.lockedShapes).toEqual([{ id: 'a', name: 'A' }]);
  });

  it('toggle-selection-proportion-lock returns selection info when called without args', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-proportion-lock');
    if (!tool) throw new Error('toggle-selection-proportion-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a' }, { id: 'b' }] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)();
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    // @ts-expect-error ensure payload fields exist
    expect(resp.payload.selectedObjects.length).toBe(2);
  });

  it('toggle-selection-proportion-lock surfaces mixed selection prompt', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-proportion-lock');
    if (!tool) throw new Error('toggle-selection-proportion-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] } });
    sendMock.mockResolvedValueOnce({ success: false, message: 'MIXED_SELECTION', payload: { lockedShapes: [{ id: 'a', name: 'A' }], unlockedShapes: [{ id: 'b', name: 'B' }] } });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({});
    expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_PROPORTION_LOCK', { shapeIds: ['a', 'b'] });
    expect(resp.message).toMatch(/Locked: A/);
    expect(resp.message).toMatch(/Unlocked: B/);
  });

  it('toggle-selection-proportion-lock can lock proportions when lock=true', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-proportion-lock');
    if (!tool) throw new Error('toggle-selection-proportion-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 'a', name: 'A' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { lockedShapes: [{ id: 'a', name: 'A' }] }, message: 'Locked 1 shape' });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({ lock: true });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_PROPORTION_LOCK', { lock: true, shapeIds: ['a'] });
    expect((resp.payload as unknown as { lockedShapes?: Array<{ id: string }>} )?.lockedShapes).toEqual([{ id: 'a', name: 'A' }]);
  });

  it('toggle-selection-proportion-lock falls back to GET_SELECTION_DUMP when GET_SELECTION_INFO returns no selection', async () => {
    const tool = FT.functionTools.find(t => t.id === 'toggle-selection-proportion-lock');
    if (!tool) throw new Error('toggle-selection-proportion-lock tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // First call: GET_SELECTION_INFO returns empty
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 0, selectedObjects: [] } });
    // Second call: GET_SELECTION_DUMP returns a selected object
    sendMock.mockResolvedValueOnce({ success: true, payload: { selectionCount: 1, selectedObjects: [{ id: 'dump-shape', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }], currentSelectionIds: ['dump-shape'], timestamp: Date.now() } });
    // Third call: TOGGLE_SELECTION_PROPORTION_LOCK responds
    sendMock.mockResolvedValueOnce({ success: true, payload: { lockedShapes: [{ id: 'dump-shape', name: 'Dump' }], selectionSnapshot: [{ id: 'dump-shape', finalRatioLocked: true, remainingRatioFlags: { proportionLock: true } }] } });

    const resp = await (tool!.function as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>> )({ lock: true });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_DUMP', undefined);
    expect(sendMessageToPlugin).toHaveBeenCalledWith('TOGGLE_SELECTION_PROPORTION_LOCK', { lock: true, shapeIds: ['dump-shape'] });
    expect((resp.payload as any).lockedShapes?.[0].id).toBe('dump-shape');
  });

  it('dump-selection returns detailed snapshot when called', async () => {
    const tool = FT.functionTools.find(t => t.id === 'dump-selection');
    if (!tool) throw new Error('dump-selection tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ success: true, payload: { selectionCount: 1, selectedObjects: [{ id: 'a', type: 'rectangle', x: 10, y: 10, width: 100, height: 50, locked: false, keys: ['id','type'] }], currentSelectionIds: ['a'], timestamp: Date.now() } });

    const resp = await (tool!.function as unknown as () => Promise<Record<string, unknown>>)();
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_DUMP', undefined);
    expect((resp.payload as any).selectionCount).toBe(1);
    expect((resp.payload as any).selectedObjects[0].type).toBe('rectangle');
    expect(Array.isArray((resp.payload as any).currentSelectionIds)).toBe(true);
    expect(typeof (resp.payload as any).timestamp).toBe('number');
  });

  // NOTE: The plugin handler now always logs a concise diagnostic when toggling
  // proportions. There is no longer a debugDump flag to forward; the wrapper
  // should continue to forward lock/shapeIds only.

  it('set-selection-border-radius calls GET_SELECTION_INFO when no value provided', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-border-radius');
    if (!tool) throw new Error('set-selection-border-radius tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 'a', name: 'A' }] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)();
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    // @ts-expect-error ensure payload fields exist
    expect(resp.payload.selectedObjects.length).toBe(1);
  });

  it('set-selection-border-radius warns when no shapes are selected', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-border-radius');
    if (!tool) throw new Error('set-selection-border-radius tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // GET_SELECTION_INFO returns selectionCount 0
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 0, selectedObjects: [] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>> )({ borderRadius: 5 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    expect(resp.message).toContain('Select at least one shape before changing the border radius.');
  });

  it('set-selection-border-radius applies radius and handles no-op response', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-border-radius');
    if (!tool) throw new Error('set-selection-border-radius tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // First GET_SELECTION_INFO indicates shapes selected
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a' }, { id: 'b' }] } });
    // Next call is SET_SELECTION_BORDER_RADIUS which returns changedShapeIds empty
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: [] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>> )({ borderRadius: 8 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_BORDER_RADIUS', { borderRadius: 8 });
    expect(resp.message).toContain('Border radius change did not apply to any shapes');
  });

  it('set-selection-opacity should parse "50%" and call SET_SELECTION_OPACITY with 0.5', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // First call returns selection info
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's1', name: 'Ellipse' }] } });
    // Second call is the actual SET_SELECTION_OPACITY
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s1'], appliedOpacity: 0.5 } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: '50%' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.5 });
    expect(resp.success).toBe(true);
  });

  it('set-selection-opacity should parse numeric 50 as 0.5', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's2' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s2'], appliedOpacity: 0.5 } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 50 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.5 });
    expect(resp.success).toBe(true);
  });

  it('set-selection-opacity should accept string decimals like "0.5"', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's3' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s3'], appliedOpacity: 0.5 } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: '0.5' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.5 });
    expect(resp.success).toBe(true);
  });

  it('set-selection-opacity should parse "half"', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's4' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s4'], appliedOpacity: 0.5 } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 'half' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.5 });
    expect(resp.success).toBe(true);
  });

  it('set-selection-opacity should parse "half-opacity"', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's5' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s5'], appliedOpacity: 0.5 } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 'half-opacity' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.5 });
    expect(resp.success).toBe(true);
  });

  it('set-selection-opacity should parse "transparent" and "opaque"', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's6' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s6'], appliedOpacity: 0 } });

    const resp1 = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 'transparent' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0 });
    expect(resp1.success).toBe(true);

    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's7' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s7'], appliedOpacity: 1 } });

    const resp2 = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 'opaque' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 1 });
    expect(resp2.success).toBe(true);
  });

  it('set-selection-opacity should parse "quarter" and "three quarters"', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-opacity');
    if (!tool) throw new Error('set-selection-opacity tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's8' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s8'], appliedOpacity: 0.25 } });

    const resp1 = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 'quarter' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.25 });
    expect(resp1.success).toBe(true);

    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 's9' }] } });
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: ['s9'], appliedOpacity: 0.75 } });

    const resp2 = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)({ opacity: 'three quarters' });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_OPACITY', { opacity: 0.75 });
    expect(resp2.success).toBe(true);
  });

  it('set-selection-bounds calls GET_SELECTION_INFO when no values provided', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-bounds');
    if (!tool) throw new Error('set-selection-bounds tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 1, selectedObjects: [{ id: 'a', name: 'A' }] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>)();
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    // @ts-expect-error payload typing is union - assert fields here
    expect(resp.payload.selectedObjects[0].id).toBe('a');
  });

  it('set-selection-bounds warns when no shapes are selected', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-bounds');
    if (!tool) throw new Error('set-selection-bounds tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // GET_SELECTION_INFO returns selectionCount 0
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 0, selectedObjects: [] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>> )({ width: 5, height: 6 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('GET_SELECTION_INFO', undefined);
    expect(resp.message).toContain('Select at least one shape before changing bounds.');
  });

  it('set-selection-bounds applies and no-op response handled', async () => {
    const tool = FT.functionTools.find(t => t.id === 'set-selection-bounds');
    if (!tool) throw new Error('set-selection-bounds tool not found');

    const sendMock = sendMessageToPlugin as unknown as ReturnType<typeof vi.fn>;
    // First GET_SELECTION_INFO indicates shapes selected
    sendMock.mockResolvedValueOnce({ payload: { selectionCount: 2, selectedObjects: [{ id: 'a' }, { id: 'b' }] } });
    // Next call is SET_SELECTION_BOUNDS which returns changedShapeIds empty
    sendMock.mockResolvedValueOnce({ success: true, payload: { changedShapeIds: [] } });

    const resp = await (tool!.function as unknown as (args?: Record<string, unknown>) => Promise<Record<string, unknown>> )({ width: 8, height: 9 });
    expect(sendMessageToPlugin).toHaveBeenCalledWith('SET_SELECTION_BOUNDS', { width: 8, height: 9 });
    expect(resp.message).toContain('Bounds change did not apply to any shapes');
  });
});
