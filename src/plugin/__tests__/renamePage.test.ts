import { renamePageTool, undoLastAction, redoLastAction } from '../mainHandlers';
import { ClientQueryType, RenamePageQueryPayload } from '../../types/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock penpot global
const mockPage1 = { id: 'page-1', name: 'Original Name' };

const mockPenpot = {
  currentFile: {
    pages: [mockPage1],
  },
  currentPage: mockPage1,
};

global.penpot = mockPenpot as any;

describe('renamePageTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage1.name = 'Original Name'; // Reset name
    mockPenpot.currentPage = mockPage1;
  });

  it('renames current page and supports undo/redo', async () => {
    // 1. Rename page
    const payload: RenamePageQueryPayload = { newName: 'New Name' };
    const result = await renamePageTool(payload);

    expect(result.success).toBe(true);
    expect(mockPage1.name).toBe('New Name');

    // Verify undo info
    const undoInfo = result.payload?.undoInfo;
    expect(undoInfo?.undoData).toEqual({
      pageId: 'page-1',
      oldName: 'Original Name',
      newName: 'New Name',
    });

    // 2. Undo: Should revert to Original Name
    const undoResult = await undoLastAction({} as any);
    expect(undoResult.success).toBe(true);
    expect(mockPage1.name).toBe('Original Name');

    // 3. Redo: Should change back to New Name
    const redoResult = await redoLastAction({} as any);
    expect(redoResult.success).toBe(true);
    expect(mockPage1.name).toBe('New Name');
  });

  it('renames page by ID', async () => {
    const payload: RenamePageQueryPayload = { 
      pageId: 'page-1', 
      newName: 'ID Renamed' 
    };
    const result = await renamePageTool(payload);

    expect(result.success).toBe(true);
    expect(mockPage1.name).toBe('ID Renamed');
  });

  it('returns error for empty name', async () => {
    const payload: RenamePageQueryPayload = { newName: '   ' };
    const result = await renamePageTool(payload);

    expect(result.success).toBe(false);
    expect(result.message).toBe('New page name is required');
  });

  it('returns error if page not found', async () => {
    const payload: RenamePageQueryPayload = { 
      pageId: 'non-existent', 
      newName: 'New Name' 
    };
    const result = await renamePageTool(payload);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});
