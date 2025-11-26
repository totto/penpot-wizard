import { createPageTool, undoLastAction, redoLastAction } from '../mainHandlers';
import { ClientQueryType, CreatePageQueryPayload } from '../../types/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock penpot global
const mockPage1 = { id: 'page-1', name: 'Page 1' };
const mockNewPage = { id: 'new-page-id', name: 'New Page' };

const mockPenpot = {
  createPage: vi.fn(() => mockNewPage),
  openPage: vi.fn(),
  currentPage: mockPage1,
};

global.penpot = mockPenpot as any;

describe('createPageTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation if needed
    mockPenpot.createPage.mockReturnValue(mockNewPage);
  });

  it('creates a new page with name and opens it', async () => {
    const payload: CreatePageQueryPayload = { 
      name: 'My New Page',
      openAfterCreate: true 
    };

    const result = await createPageTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.createPage).toHaveBeenCalled();
    expect(mockNewPage.name).toBe('My New Page');
    expect(mockPenpot.openPage).toHaveBeenCalledWith(mockNewPage);

    // Verify undo info
    const undoInfo = result.payload?.undoInfo;
    expect(undoInfo).toBeDefined();
    expect(undoInfo?.actionType).toBe(ClientQueryType.CREATE_PAGE);
  });

  it('creates a page without opening it', async () => {
    const payload: CreatePageQueryPayload = { 
      name: 'Background Page',
      openAfterCreate: false 
    };

    const result = await createPageTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.createPage).toHaveBeenCalled();
    expect(mockPenpot.openPage).not.toHaveBeenCalled();
  });

  it('handles undo/redo limitations gracefully', async () => {
    // Perform create action
    await createPageTool({ name: 'Test Page' });

    // Undo: Should warn but not fail
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
    const undoResult = await undoLastAction({} as any);
    
    expect(undoResult.success).toBe(true); // Undo action itself succeeds in terms of flow
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot undo page creation'));
    
    // Redo: Should warn but not fail
    const redoResult = await redoLastAction({} as any);
    
    expect(redoResult.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot redo page creation'));
    
    consoleSpy.mockRestore();
  });
});
