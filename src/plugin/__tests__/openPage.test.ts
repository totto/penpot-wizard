import { openPageTool, undoLastAction, redoLastAction } from '../mainHandlers';
import { ClientQueryType, OpenPageQueryPayload } from '../../types/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock penpot global
const mockPage1 = { id: 'page-1', name: 'Page 1' };
const mockPage2 = { id: 'page-2', name: 'Page 2' };

const mockPenpot = {
  currentFile: {
    pages: [mockPage1, mockPage2],
  },
  currentPage: mockPage1,
  openPage: vi.fn(),
};

global.penpot = mockPenpot as any;

describe('openPageTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPenpot.currentPage = mockPage1;
  });

  it('opens a page by ID and supports undo/redo', async () => {
    // 1. Open Page 2 by ID
    const payload: OpenPageQueryPayload = { pageId: 'page-2' };
    const result = await openPageTool(payload);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Opened page "Page 2"');
    expect(mockPenpot.openPage).toHaveBeenCalledWith(mockPage2);

    // Verify undo info
    const undoInfo = result.payload?.undoInfo;
    expect(undoInfo).toBeDefined();
    expect(undoInfo?.actionType).toBe(ClientQueryType.OPEN_PAGE);
    expect(undoInfo?.undoData).toEqual({
      previousPageId: 'page-1',
      previousPageName: 'Page 1',
      targetPageId: 'page-2',
      targetPageName: 'Page 2',
    });

    // 2. Undo: Should go back to Page 1
    const undoResult = await undoLastAction({} as any);
    expect(undoResult.success).toBe(true);
    expect(mockPenpot.openPage).toHaveBeenCalledWith(expect.objectContaining({ id: 'page-1' }));

    // 3. Redo: Should go back to Page 2
    const redoResult = await redoLastAction({} as any);
    expect(redoResult.success).toBe(true);
    expect(mockPenpot.openPage).toHaveBeenCalledWith(expect.objectContaining({ id: 'page-2' }));
  });

  it('opens a page by name', async () => {
    const payload: OpenPageQueryPayload = { pageName: 'Page 2' };
    const result = await openPageTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.openPage).toHaveBeenCalledWith(mockPage2);
  });

  it('returns error if page not found', async () => {
    const payload: OpenPageQueryPayload = { pageId: 'non-existent' };
    const result = await openPageTool(payload);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
    expect(mockPenpot.openPage).not.toHaveBeenCalled();
  });

  it('returns error if neither ID nor name provided', async () => {
    const payload: OpenPageQueryPayload = {};
    const result = await openPageTool(payload);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Either pageId or pageName must be provided');
  });
});
