/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleAddImage, handleAddImageFromUrl } from '../mainHandlers';

describe('handleAddImage', () => {
  const originalPenpot = (globalThis as any).penpot;

  afterEach(() => {
    (globalThis as any).penpot = originalPenpot;
    vi.restoreAllMocks();
  });

  it('uploads image data and creates a rectangle with fills', async () => {
    const mockImageData = { id: 'img-1', width: 80, height: 60, mtype: 'image/png' };
    const mockUpload = vi.fn().mockResolvedValue(mockImageData);

    const mockShape: any = {
      id: 'shape-1',
      name: '',
      fills: [],
      resize: function (w:number, h:number) { this.width = w; this.height = h; }
    };

    const mockCreateRectangle = vi.fn().mockReturnValue(mockShape);

    (globalThis as any).penpot = {
      uploadMediaData: mockUpload,
      createRectangle: mockCreateRectangle,
      viewport: {
        scrollToRect: vi.fn(),
      },
    };

    const data = new Uint8Array([1,2,3]);
    const response = await handleAddImage({ name: 'uploaded-image', data, mimeType: 'image/png' });

    expect(response.success).toBe(true);
  // @ts-expect-error - payload type union in test harness
    expect(response.payload?.shapeId).toBe('shape-1');
    expect(mockUpload).toHaveBeenCalledWith('uploaded-image', data, 'image/png');
    expect(mockCreateRectangle).toHaveBeenCalled();
  expect((globalThis as any).penpot.viewport.scrollToRect).toHaveBeenCalled();
  });

  it('returns error if upload fails', async () => {
    const mockUpload = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).penpot = {
      uploadMediaData: mockUpload,
    };

    const data = new Uint8Array([123]);
    const response = await handleAddImage({ name: 'foo', data, mimeType: 'image/png' });
    expect(response.success).toBe(false);
  });

  it('centers viewport on image when using URL add image', async () => {
    const mockImageData = { id: 'img-url-1', width: 120, height: 80, mtype: 'image/jpeg' };
    const mockUpload = vi.fn().mockResolvedValue(mockImageData);
    const mockShape: any = {
      id: 'shape-url-1',
      name: '',
      fills: [],
      resize: function (w:number, h:number) { this.width = w; this.height = h; },
      x: 42,
      y: 24,
      width: 120,
      height: 80,
    };

    const mockCreateRectangle = vi.fn().mockReturnValue(mockShape);

    (globalThis as any).penpot = {
      uploadMediaUrl: mockUpload,
      createRectangle: mockCreateRectangle,
      viewport: { scrollToRect: vi.fn() },
    };

    const response = await handleAddImageFromUrl({ name: 'url-image', url: 'https://example.com/img.jpg' });
    expect(response.success).toBe(true);
    expect((globalThis as any).penpot.viewport.scrollToRect).toHaveBeenCalledWith({ x: 42, y: 24, width: 120, height: 80 });
  });
});
