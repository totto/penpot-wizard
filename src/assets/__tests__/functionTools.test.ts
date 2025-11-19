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
});
