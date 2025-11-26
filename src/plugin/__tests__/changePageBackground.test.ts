import { changePageBackgroundTool, undoLastAction, redoLastAction } from '../mainHandlers';
import { ClientQueryType, ChangePageBackgroundQueryPayload } from '../../types/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock penpot global
const mockRoot = { 
  fills: [{ fillColor: '#FFFFFF', fillOpacity: 1 }] 
};
const mockPage1 = { 
  id: 'page-1', 
  name: 'Page 1',
  root: mockRoot
};

const mockPenpot = {
  currentFile: {
    pages: [mockPage1],
  },
  currentPage: mockPage1,
};

global.penpot = mockPenpot as any;

describe('changePageBackgroundTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoot.fills = [{ fillColor: '#FFFFFF', fillOpacity: 1 }]; // Reset fills
    mockPenpot.currentPage = mockPage1;
  });

  it('changes page background and supports undo/redo', async () => {
    // 1. Change background
    const payload: ChangePageBackgroundQueryPayload = { backgroundColor: '#000000' };
    const result = await changePageBackgroundTool(payload);

    expect(result.success).toBe(true);
    expect(mockRoot.fills).toEqual([{ fillColor: '#000000', fillOpacity: 1 }]);

    // Verify undo info
    const undoInfo = result.payload?.undoInfo;
    expect(undoInfo?.undoData).toEqual({
      pageId: 'page-1',
      previousFills: [{ fillColor: '#FFFFFF', fillOpacity: 1 }],
      newColor: '#000000',
    });

    // 2. Undo: Should revert to White
    const undoResult = await undoLastAction({} as any);
    expect(undoResult.success).toBe(true);
    expect(mockRoot.fills).toEqual([{ fillColor: '#FFFFFF', fillOpacity: 1 }]);

    // 3. Redo: Should change back to Black
    const redoResult = await redoLastAction({} as any);
    expect(redoResult.success).toBe(true);
    expect(mockRoot.fills).toEqual([{ fillColor: '#000000', fillOpacity: 1 }]);
  });

  it('changes background by page ID', async () => {
    const payload: ChangePageBackgroundQueryPayload = { 
      pageId: 'page-1', 
      backgroundColor: '#FF0000' 
    };
    const result = await changePageBackgroundTool(payload);

    expect(result.success).toBe(true);
    expect(mockRoot.fills[0].fillColor).toBe('#FF0000');
  });

  it('returns error if background color missing', async () => {
    const payload: ChangePageBackgroundQueryPayload = { backgroundColor: '' };
    const result = await changePageBackgroundTool(payload);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Background color is required');
  });

  it('returns error if page root not found', async () => {
    const mockPageNoRoot = { id: 'page-no-root', root: null };
    mockPenpot.currentFile.pages.push(mockPageNoRoot as any);

    const payload: ChangePageBackgroundQueryPayload = { 
      pageId: 'page-no-root', 
      backgroundColor: '#000000' 
    };
    const result = await changePageBackgroundTool(payload);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Page root shape not found');
  });
});
