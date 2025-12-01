import { batchCreatePagesTool } from '../mainHandlers';
import { ClientQueryType, BatchCreatePagesQueryPayload, BatchCreatePagesResponsePayload } from '../../types/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock penpot global
const mockPenpot = {
  createPage: vi.fn(),
};

global.penpot = mockPenpot as any;

describe('batchCreatePagesTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock createPage to return a new object with a unique ID
    let pageCounter = 0;
    mockPenpot.createPage.mockImplementation(() => {
      pageCounter++;
      return { 
        id: `page-${pageCounter}`, 
        name: `Page ${pageCounter}` 
      };
    });
  });

  it('creates multiple pages with specified names', async () => {
    const payload: BatchCreatePagesQueryPayload = { 
      pageNames: ['Design', 'Prototype', 'Assets']
    };

    const result = await batchCreatePagesTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.createPage).toHaveBeenCalledTimes(3);
    
    const responsePayload = result.payload as BatchCreatePagesResponsePayload;
    expect(responsePayload.pages).toHaveLength(3);
    expect(responsePayload.pages[0].name).toBe('Design');
    expect(responsePayload.pages[1].name).toBe('Prototype');
    expect(responsePayload.pages[2].name).toBe('Assets');
  });

  it('handles empty names by using default', async () => {
    const payload: BatchCreatePagesQueryPayload = { 
      pageNames: ['Page 1', '', 'Page 3']
    };

    const result = await batchCreatePagesTool(payload);

    expect(result.success).toBe(true);
    const responsePayload = result.payload as BatchCreatePagesResponsePayload;
    expect(responsePayload.pages[1].name).toBe('Page 2'); // Default name from mock
  });

  it('handles empty list', async () => {
    const payload: BatchCreatePagesQueryPayload = { 
      pageNames: []
    };

    const result = await batchCreatePagesTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.createPage).not.toHaveBeenCalled();
    const responsePayload = result.payload as BatchCreatePagesResponsePayload;
    expect(responsePayload.pages).toHaveLength(0);
  });
});
