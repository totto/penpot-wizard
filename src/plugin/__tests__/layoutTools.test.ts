
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configureFlexLayoutTool,
  configureGridLayoutTool,
  configureRulerGuidesTool,

} from '../mainHandlers';

// Mock Penpot
function mockPenpot(selection: any[] = []) {
  (globalThis as any).penpot = {
    currentPage: {
      getShapeById: (id: string) => selection.find(s => s.id === id) || null,
      id: 'page-1',
      name: 'Page 1',
      rulerGuides: [],
      addRulerGuide: vi.fn(),
      removeRulerGuide: vi.fn(),
    },
    selection: selection,
  };
}

describe('Layout Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configureFlexLayoutTool', () => {
    it('configures flex layout on a board', async () => {
      const flexMock = {
        dir: 'row',
        wrap: 'nowrap',
        remove: vi.fn(),
      };
      const board = {
        id: 'board-1',
        type: 'board',
        name: 'Board 1',
        flex: flexMock,
        addFlexLayout: vi.fn(() => flexMock),
        children: [],
      };
      mockPenpot([board]);

      const response = await configureFlexLayoutTool({
        dir: 'column',
        wrap: 'wrap',
        rowGap: 10,
      });

      expect(response.success).toBe(true);
      expect(flexMock.dir).toBe('column');
      expect(flexMock.wrap).toBe('wrap');
      expect(flexMock.rowGap).toBe(10);
    });

    it('adds flex layout if missing', async () => {
      const flexMock = { dir: 'row' };
      const board = {
        id: 'board-1',
        type: 'board',
        name: 'Board 1',
        flex: undefined,
        addFlexLayout: vi.fn(() => flexMock),
        children: [],
      };
      mockPenpot([board]);

      const response = await configureFlexLayoutTool({ dir: 'column' });

      expect(response.success).toBe(true);
      expect(board.addFlexLayout).toHaveBeenCalled();
      expect(flexMock.dir).toBe('column');
    });

    it('removes flex layout', async () => {
      const flexMock = { remove: vi.fn() };
      const board = {
        id: 'board-1',
        type: 'board',
        name: 'Board 1',
        flex: flexMock,
        children: [],
      };
      mockPenpot([board]);

      const response = await configureFlexLayoutTool({ remove: true });

      expect(response.success).toBe(true);
      expect(flexMock.remove).toHaveBeenCalled();
    });
  });

  describe('configureGridLayoutTool', () => {
    it('configures grid layout on a board', async () => {
      const gridMock = {
        remove: vi.fn(),
        addRow: vi.fn(),
        addColumn: vi.fn(),
        removeRow: vi.fn(),
        removeColumn: vi.fn(),
        rows: [],
        columns: [],
      };
      const board = {
        id: 'board-1',
        type: 'board',
        name: 'Board 1',
        grid: gridMock,
        addGridLayout: vi.fn(() => gridMock),
        children: [],
      };
      mockPenpot([board]);

      const response = await configureGridLayoutTool({
        rowGap: 20,
        columnGap: 20,
        addRows: [{ type: 'fixed', value: 100 }],
      });

      expect(response.success).toBe(true);
      expect((gridMock as any).rowGap).toBe(20);
      expect((gridMock as any).columnGap).toBe(20);
      expect(gridMock.addRow).toHaveBeenCalledWith('fixed', 100);
    });
  });

  describe('configureRulerGuidesTool', () => {
    it('adds ruler guides to page', async () => {
      mockPenpot([]);
      const page = (globalThis as any).penpot.currentPage;

      const response = await configureRulerGuidesTool({
        scope: 'page',
        addGuides: [{ orientation: 'vertical', position: 100 }],
      });

      expect(response.success).toBe(true);
      expect(page.addRulerGuide).toHaveBeenCalledWith('vertical', 100);
    });

    it('removes all ruler guides from board', async () => {
      const guide = { orientation: 'horizontal', position: 50 };
      const board = {
        id: 'board-1',
        type: 'board',
        name: 'Board 1',
        rulerGuides: [guide],
        removeRulerGuide: vi.fn(),
      };
      mockPenpot([board]);

      const response = await configureRulerGuidesTool({
        scope: 'board',
        removeAll: true,
      });

      expect(response.success).toBe(true);
      expect(board.removeRulerGuide).toHaveBeenCalledWith(guide);
    });
  });


});
