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
    // newly created image must be selected
    expect((globalThis as any).penpot.selection).toEqual([mockShape]);
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

  it('moves image near selection when upload by bytes and no viewport available', async () => {
    const mockImageData = { id: 'img-b-1', width: 64, height: 64, mtype: 'image/png' };
    const mockUpload = vi.fn().mockResolvedValue(mockImageData);
    const mockShape: any = {
      id: 'shape-b-1',
      name: '',
      fills: [],
      resize: function (w:number, h:number) { this.width = w; this.height = h; }
    };

    const mockCreateRectangle = vi.fn().mockReturnValue(mockShape);

    (globalThis as any).penpot = {
      uploadMediaData: mockUpload,
      createRectangle: mockCreateRectangle,
      currentPage: {
        getSelectedShapes: () => [ { id: 'selb1', x: 200, y: 40, width: 120, height: 30 } ]
      }
    };

    const data = new Uint8Array([255,0,127]);
    const response = await handleAddImage({ name: 'b-image', data, mimeType: 'image/png' });
    expect(response.success).toBe(true);
    expect(mockCreateRectangle).toHaveBeenCalled();
    expect(mockShape.x).toBe(200 + 120 + 20);
    expect(mockShape.y).toBe(40);
    // newly created image must be selected
    expect((globalThis as any).penpot.selection).toEqual([mockShape]);
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
    // newly created image must be selected
    expect((globalThis as any).penpot.selection).toEqual([mockShape]);
  });

  it('moves image near selection when viewport not available', async () => {
    const mockImageData = { id: 'img-url-2', width: 200, height: 150, mtype: 'image/png' };
    const mockUpload = vi.fn().mockResolvedValue(mockImageData);
    const mockShape: any = {
      id: 'shape-url-2',
      name: '',
      fills: [],
      resize: function (w:number, h:number) { this.width = w; this.height = h; }
    };

    const mockCreateRectangle = vi.fn().mockReturnValue(mockShape);

    (globalThis as any).penpot = {
      uploadMediaUrl: mockUpload,
      createRectangle: mockCreateRectangle,
      // No viewport available to mimic environment
      currentPage: {
        getSelectedShapes: () => [ { id: 'sel1', x: 10, y: 20, width: 50, height: 50 } ]
      }
    };

    const response = await handleAddImageFromUrl({ name: 'url-image-2', url: 'https://example.com/img2.jpg' });
    expect(response.success).toBe(true);
    // @ts-expect-error - typed payload union for test harness
    expect(response.payload?.shapeId).toBe('shape-url-2');
    expect(mockCreateRectangle).toHaveBeenCalled();
    expect(mockShape.x).toBe(10 + 50 + 20);
    expect(mockShape.y).toBe(20);
    // newly created image must be selected
    expect((globalThis as any).penpot.selection).toEqual([mockShape]);
  });
});
