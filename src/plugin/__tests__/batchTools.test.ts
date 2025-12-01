import { batchCreatePagesTool, batchCreateComponentsTool, getColorPaletteTool, exportProjectTool } from '../mainHandlers';
import { 
  ClientQueryType, 
  BatchCreatePagesQueryPayload, 
  BatchCreatePagesResponsePayload,
  BatchCreateComponentsQueryPayload,
  BatchCreateComponentsResponsePayload,
  GetColorPaletteResponsePayload,
  ExportProjectQueryPayload,
  ExportProjectResponsePayload
} from '../../types/types';
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

describe('batchCreateComponentsTool', () => {
  const mockShape1 = { id: 'shape-1', type: 'rectangle' };
  const mockShape2 = { id: 'shape-2', type: 'ellipse' };
  const mockComponent = { id: 'comp-1', name: 'New Component' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock shapes.get
    mockPenpot.shapes = {
      get: vi.fn((id) => {
        if (id === 'shape-1') return mockShape1;
        if (id === 'shape-2') return mockShape2;
        return undefined;
      }),
    };

    // Mock library.local.createComponent
    mockPenpot.library = {
      local: {
        createComponent: vi.fn(() => ({ ...mockComponent })),
      },
    };
  });

  it('creates multiple components from valid shapes', async () => {
    const payload: BatchCreateComponentsQueryPayload = {
      components: [
        { name: 'Button', shapeIds: ['shape-1'] },
        { name: 'Icon', shapeIds: ['shape-2'] }
      ]
    };

    const result = await batchCreateComponentsTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.library.local.createComponent).toHaveBeenCalledTimes(2);
    
    const responsePayload = result.payload as BatchCreateComponentsResponsePayload;
    expect(responsePayload.components).toHaveLength(2);
    expect(responsePayload.components[0].name).toBe('Button');
    expect(responsePayload.components[1].name).toBe('Icon');
  });

  it('skips components with invalid shape IDs', async () => {
    const payload: BatchCreateComponentsQueryPayload = {
      components: [
        { name: 'Valid', shapeIds: ['shape-1'] },
        { name: 'Invalid', shapeIds: ['non-existent'] }
      ]
    };

    const result = await batchCreateComponentsTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.library.local.createComponent).toHaveBeenCalledTimes(1);
    
    const responsePayload = result.payload as BatchCreateComponentsResponsePayload;
    expect(responsePayload.components).toHaveLength(1);
    expect(responsePayload.components[0].name).toBe('Valid');
  });

  it('handles empty component list', async () => {
    const payload: BatchCreateComponentsQueryPayload = {
      components: []
    };

    const result = await batchCreateComponentsTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.library.local.createComponent).not.toHaveBeenCalled();
  });
});

describe('getColorPaletteTool', () => {
  const mockColor1 = { 
    id: 'color-1', 
    name: 'Primary', 
    color: '#FF0000', 
    opacity: 1,
    path: 'Brand/Primary'
  };
  const mockColor2 = { 
    id: 'color-2', 
    name: 'Secondary', 
    color: '#00FF00', 
    opacity: 0.5 
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock library.local.colors
    mockPenpot.library = {
      local: {
        colors: [mockColor1, mockColor2],
      },
    };
  });

  it('retrieves all colors from the library', async () => {
    const result = await getColorPaletteTool();

    expect(result.success).toBe(true);
    
    const responsePayload = result.payload as GetColorPaletteResponsePayload;
    expect(responsePayload.colors).toHaveLength(2);
    expect(responsePayload.colors[0]).toEqual(mockColor1);
    expect(responsePayload.colors[1]).toEqual(mockColor2);
  });

  it('handles empty library gracefully', async () => {
    mockPenpot.library.local.colors = [];

    const result = await getColorPaletteTool();

    expect(result.success).toBe(true);
    const responsePayload = result.payload as GetColorPaletteResponsePayload;
    expect(responsePayload.colors).toHaveLength(0);
  });

  it('handles missing library gracefully', async () => {
    mockPenpot.library = undefined;

    const result = await getColorPaletteTool();

    expect(result.success).toBe(true);
    const responsePayload = result.payload as GetColorPaletteResponsePayload;
    expect(responsePayload.colors).toHaveLength(0);
  });
});

describe('exportProjectTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock penpot.file.export
    mockPenpot.file = {
      export: vi.fn(),
    };
  });

  it('initiates project export successfully', async () => {
    const payload: ExportProjectQueryPayload = { filename: 'MyProject' };
    
    const result = await exportProjectTool(payload);

    expect(result.success).toBe(true);
    expect(mockPenpot.file.export).toHaveBeenCalledWith('MyProject');
    
    const responsePayload = result.payload as ExportProjectResponsePayload;
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.message).toBe('Export started');
  });

  it('handles missing export API gracefully', async () => {
    // Simulate missing API
    mockPenpot.file = undefined;

    const result = await exportProjectTool({});

    expect(result.success).toBe(false);
    expect(result.message).toContain('Export API not available');
  });

  it('handles export errors gracefully', async () => {
    mockPenpot.file.export.mockRejectedValue(new Error('Export failed'));

    const result = await exportProjectTool({});

    expect(result.success).toBe(false);
    expect(result.message).toContain('Error exporting project');
    expect(result.message).toContain('Export failed');
  });
});
