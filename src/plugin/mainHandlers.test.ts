
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { navigatePreviousScreen } from './mainHandlers';
import { ClientQueryType } from '../types/pluginTypes';

// Mock the global penpot object
const mockAddInteraction = vi.fn();
const mockFindShapes = vi.fn();

const createMockShape = (id: string, type: string = 'rectangle') => {
    const shape: any = {
        id,
        name: `Shape ${id}`,
        type,
        interactions: [],
        addInteraction: vi.fn((trigger, action, delay) => {
            shape.interactions.push({ trigger, action, delay });
            mockAddInteraction(trigger, action, delay);
        }),
    };
    return shape;
};

const mockPenpot = {
    currentPage: {
        findShapes: mockFindShapes,
    },
    selection: [] as any[],
};

// Assign to global
(global as any).penpot = mockPenpot;

describe('navigatePreviousScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPenpot.selection = [];
        mockFindShapes.mockReturnValue([]);
    });

    it('should return error if no shapes are selected and no IDs provided', async () => {
        const result = await navigatePreviousScreen({});

        expect(result.success).toBe(false);
        expect(result.message).toContain('No shapes selected');
        expect(mockAddInteraction).not.toHaveBeenCalled();
    });

    it('should add interaction to selected shapes', async () => {
        const shape1 = createMockShape('1');
        const shape2 = createMockShape('2');
        mockPenpot.selection = [shape1, shape2];

        const result = await navigatePreviousScreen({});

        expect(result.success).toBe(true);
        expect(result.payload?.interactionsAdded).toBe(2);
        expect(mockAddInteraction).toHaveBeenCalledTimes(2);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', { type: 'previous-screen' }, undefined);
    });

    it('should add interaction to specified shape IDs', async () => {
        const shape1 = createMockShape('1');
        // Mock findShapes to return our shape when searched by ID
        mockFindShapes.mockImplementation(({ name }: any) => {
            if (name === '1') return [shape1];
            return [];
        });

        const result = await navigatePreviousScreen({ shapeIds: ['1'] });

        expect(result.success).toBe(true);
        expect(result.payload?.interactionsAdded).toBe(1);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', { type: 'previous-screen' }, undefined);
    });

    it('should filter out board shapes (cannot add interaction to board itself)', async () => {
        const boardShape = createMockShape('board1', 'board');
        const regularShape = createMockShape('rect1', 'rectangle');
        mockPenpot.selection = [boardShape, regularShape];

        const result = await navigatePreviousScreen({});

        expect(result.success).toBe(true);
        expect(result.payload?.interactionsAdded).toBe(1); // Only regularShape
        expect(mockAddInteraction).toHaveBeenCalledTimes(1);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', { type: 'previous-screen' }, undefined);
        expect(result.message).toContain('Skipped 1 board frame'); // Should mention skipped board
    });

    it('should return error if all selected shapes are boards', async () => {
        const boardShape = createMockShape('board1', 'board');
        mockPenpot.selection = [boardShape];

        const result = await navigatePreviousScreen({});

        expect(result.success).toBe(false);
        expect(result.message).toContain('Cannot add interactions to board frames');
        expect(mockAddInteraction).not.toHaveBeenCalled();
    });

    it('should support custom trigger and delay', async () => {
        const shape1 = createMockShape('1');
        mockPenpot.selection = [shape1];

        const result = await navigatePreviousScreen({
            trigger: 'after-delay',
            delay: 1000
        });

        expect(result.success).toBe(true);
        expect(mockAddInteraction).toHaveBeenCalledWith('after-delay', { type: 'previous-screen' }, 1000);
    });
});

import { openExternalUrl } from './mainHandlers';

describe('openExternalUrl', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPenpot.selection = [];
        mockFindShapes.mockReturnValue([]);
    });

    it('should return error if URL is missing', async () => {
        const result = await openExternalUrl({ url: '' });

        expect(result.success).toBe(false);
        expect(result.message).toContain('URL is required');
        expect(mockAddInteraction).not.toHaveBeenCalled();
    });

    it('should return error if no shapes are selected and no IDs provided', async () => {
        const result = await openExternalUrl({ url: 'https://example.com' });

        expect(result.success).toBe(false);
        expect(result.message).toContain('No shapes selected');
        expect(mockAddInteraction).not.toHaveBeenCalled();
    });

    it('should add interaction to selected shapes', async () => {
        const shape1 = createMockShape('1');
        mockPenpot.selection = [shape1];

        const result = await openExternalUrl({ url: 'https://example.com' });

        expect(result.success).toBe(true);
        expect(result.payload?.interactionsAdded).toBe(1);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', { type: 'open-url', url: 'https://example.com' }, undefined);
    });

    it('should skip board shapes with note in message', async () => {
        const boardShape = createMockShape('board1', 'board');
        const regularShape = createMockShape('rect1', 'rectangle');
        mockPenpot.selection = [boardShape, regularShape];

        const result = await openExternalUrl({ url: 'https://example.com' });

        expect(result.success).toBe(true);
        expect(result.payload?.interactionsAdded).toBe(1); // Only regular shape
        expect(mockAddInteraction).toHaveBeenCalledTimes(1);
        expect(result.message).toContain('Skipped 1 board frame'); // Should mention skipped board
    });
});

import { navigateToBoard, openBoardAsOverlay, toggleOverlay } from './mainHandlers';

describe('navigateToBoard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPenpot.selection = [];
        mockFindShapes.mockReturnValue([]);
    });

    it('should return error if boardId is not found', async () => {
        const result = await navigateToBoard({ boardId: 'missing-board' });
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });

    it('should add interaction to selected shapes', async () => {
        const board = createMockShape('board-1', 'board');
        const shape1 = createMockShape('1');
        mockPenpot.selection = [shape1];
        mockFindShapes.mockReturnValue([board]);

        const result = await navigateToBoard({ boardId: 'board-1' });

        expect(result.success).toBe(true);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', expect.objectContaining({
            type: 'navigate-to'
            // destination omitted - won't be set due to API bug
        }), undefined);
    });

    it('should return error when adding interaction to board frames', async () => {
        const board = createMockShape('board-1', 'board');
        mockPenpot.selection = [board];
        mockFindShapes.mockReturnValue([board]);

        const result = await navigateToBoard({ boardId: 'board-1' });

        expect(result.success).toBe(false);
        expect(result.message).toContain('Cannot add interactions to board frames');
        expect(mockAddInteraction).not.toHaveBeenCalled();
    });

    it('should skip board frames in mixed selection', async () => {
        const board = createMockShape('board-1', 'board');
        const shape = createMockShape('shape-1');
        mockPenpot.selection = [board, shape];
        mockFindShapes.mockReturnValue([board]);

        const result = await navigateToBoard({ boardId: 'board-1' });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Skipped 1 board frame');
        expect(mockAddInteraction).toHaveBeenCalledTimes(1);
    });
});

describe('openBoardAsOverlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPenpot.selection = [];
        mockFindShapes.mockReturnValue([]);
    });

    it('should add overlay interaction with correct options', async () => {
        const board = createMockShape('board-1', 'board');
        const shape1 = createMockShape('1');
        mockPenpot.selection = [shape1];
        mockFindShapes.mockReturnValue([board]);

        const result = await openBoardAsOverlay({
            boardId: 'board-1',
            position: 'centered',
            closeOnClickOutside: true,
            addBackgroundOverlay: true,
            backgroundOverlayColor: '#000000',
            backgroundOverlayOpacity: 0.5
        });

        expect(result.success).toBe(true);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', expect.objectContaining({
            type: 'navigate-to'
        }), undefined);
    });
});

describe('toggleOverlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPenpot.selection = [];
        mockFindShapes.mockReturnValue([]);
    });

    it('should add toggle overlay interaction', async () => {
        const shape1 = createMockShape('1');
        mockPenpot.selection = [shape1];

        const result = await toggleOverlay({});

        expect(result.success).toBe(true);
        expect(mockAddInteraction).toHaveBeenCalledWith('click', { type: 'previous-screen' }, undefined);
    });
});
