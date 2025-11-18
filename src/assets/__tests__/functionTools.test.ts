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
    (sendMessageToPlugin as any).mockResolvedValueOnce({ payload: { selectedObjects: [{ id: 's1', width: 10, height: 20 }] } });

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
});
