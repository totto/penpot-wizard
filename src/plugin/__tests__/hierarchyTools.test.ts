
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getChildrenTool,
    appendChildTool,
    insertChildTool,
    getChildPropertiesTool,
    getParentElementTool
} from '../mainHandlers';
import { ClientQueryType } from '../types/pluginTypes';

// Mock global penpot object
const mockScrollToRect = vi.fn();
const mockUpdateSelection = vi.fn();

const createMockShape = (id: string, type: string = 'rectangle', name?: string) => {
    const shape: any = {
        id,
        name: name || `Shape ${id}`,
        type,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        children: [],
        parent: null,
        appendChild: vi.fn((child) => {
            shape.children.push(child);
            child.parent = shape;
        }),
        insertChild: vi.fn((index, child) => {
            shape.children.splice(index, 0, child);
            child.parent = shape;
        }),
        layoutChild: { zIndex: 0 }, // For z-index tests
    };
    return shape;
};

const mockPenpot = {
    currentPage: {
        getShapeById: vi.fn(),
    },
    viewport: {
        scrollToRect: mockScrollToRect,
    },
};

// Assign to global
(global as any).penpot = mockPenpot;

// Mock updateCurrentSelection helper (imported in mainHandlers)
// Since it's not exported from mainHandlers to be mocked easily via vi.mock, 
// we might need to rely on the fact that mainHandlers uses a local helper or global.
// For this test environment, we'll assume the tool calls the global helper if it exists, 
// or we verify the console.debug logs if we can't mock the internal function directly.
// However, looking at mainHandlers.ts, updateCurrentSelection is passed in payload for some tools?
// No, it's passed as a boolean flag in payload, and the function calls a helper.
// We'll mock the helper if possible, or just verify the tool returns success.

describe('Hierarchy Tools', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPenpot.currentPage.getShapeById.mockReset();
    });

    describe('getChildrenTool', () => {
        it('should return children of a shape', async () => {
            const parent = createMockShape('parent', 'board');
            const child1 = createMockShape('child1');
            const child2 = createMockShape('child2');
            parent.children = [child1, child2];

            mockPenpot.currentPage.getShapeById.mockReturnValue(parent);

            const result = await getChildrenTool({ shapeId: 'parent' });

            expect(result.success).not.toBe(false);
            expect(result.payload).toBeDefined();
            if (result.payload && 'children' in result.payload) {
                expect(result.payload.children).toHaveLength(2);
                expect(result.payload.children[0].id).toBe('child1');
                expect(result.payload.children[1].id).toBe('child2');
            }
        });

        it('should return error if shape not found', async () => {
            mockPenpot.currentPage.getShapeById.mockReturnValue(null);
            const result = await getChildrenTool({ shapeId: 'missing' });
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });
    });

    describe('appendChildTool', () => {
        it('should append child and center it on parent', async () => {
            const parent = createMockShape('parent', 'board');
            parent.width = 1000;
            parent.height = 1000;
            parent.x = 0;
            parent.y = 0;

            const child = createMockShape('child', 'rectangle');
            child.width = 100;
            child.height = 100;
            child.x = 0; // Initially at 0,0

            mockPenpot.currentPage.getShapeById.mockImplementation((id: string) => {
                if (id === 'parent') return parent;
                if (id === 'child') return child;
                return null;
            });

            const result = await appendChildTool({
                parentId: 'parent',
                childId: 'child',
                scrollToRect: true,
                bringToFront: true
            });

            expect(result.success).not.toBe(false);
            expect(parent.appendChild).toHaveBeenCalledWith(child);

            // Parent center is 500, 500
            // Child center should be 500, 500
            // Child x = 500 - 50 = 450
            // Child y = 500 - 50 = 450
            expect(child.x).toBe(450);
            expect(child.y).toBe(450);
            expect(mockScrollToRect).toHaveBeenCalled();
        });

        it('should apply stacking offset if children exist near center', async () => {
            const parent = createMockShape('parent', 'board');
            parent.width = 1000;
            parent.height = 1000;

            // Existing child at center (450, 450)
            const existingChild = createMockShape('existing');
            existingChild.width = 100;
            existingChild.height = 100;
            existingChild.x = 450;
            existingChild.y = 450;
            parent.children = [existingChild];

            const newChild = createMockShape('new', 'rectangle');
            newChild.width = 100;
            newChild.height = 100;

            mockPenpot.currentPage.getShapeById.mockImplementation((id: string) => {
                if (id === 'parent') return parent;
                if (id === 'new') return newChild;
                return null;
            });

            await appendChildTool({ parentId: 'parent', childId: 'new' });

            // Should be offset by 20px (STACK_OFFSET)
            // 450 + 20 = 470
            expect(newChild.x).toBe(470);
            expect(newChild.y).toBe(470);
        });
    });

    describe('insertChildTool', () => {
        it('should insert child at specific index', async () => {
            const parent = createMockShape('parent', 'board');
            const child1 = createMockShape('child1');
            const child2 = createMockShape('child2');
            parent.children = [child1, child2];

            const newChild = createMockShape('new');

            mockPenpot.currentPage.getShapeById.mockImplementation((id: string) => {
                if (id === 'parent') return parent;
                if (id === 'new') return newChild;
                return null;
            });

            const result = await insertChildTool({
                parentId: 'parent',
                childId: 'new',
                index: 1
            });

            expect(result.success).not.toBe(false);
            expect(parent.insertChild).toHaveBeenCalledWith(1, newChild);
        });

        it('should fail if index is out of bounds', async () => {
            const parent = createMockShape('parent', 'board');
            const newChild = createMockShape('new');

            mockPenpot.currentPage.getShapeById.mockImplementation((id: string) => {
                if (id === 'parent') return parent;
                if (id === 'new') return newChild;
                return null;
            });

            const result = await insertChildTool({
                parentId: 'parent',
                childId: 'new',
                index: 5 // Only 0 children, so 5 is invalid
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('out of bounds');
            expect(parent.insertChild).not.toHaveBeenCalled();
        });
    });

    describe('getChildPropertiesTool', () => {
        it('should return properties', async () => {
            const shape = createMockShape('shape1');
            (shape as any).constraintsHorizontal = 'scale';
            (shape as any).locked = true;

            mockPenpot.currentPage.getShapeById.mockReturnValue(shape);

            const result = await getChildPropertiesTool({ shapeId: 'shape1' });

            expect(result.success).not.toBe(false);
            if (result.payload && 'constraintsHorizontal' in result.payload) {
                expect(result.payload.constraintsHorizontal).toBe('scale');
                expect(result.payload.locked).toBe(true);
            }
        });
    });

    describe('getParentElementTool', () => {
        it('should return parent info', async () => {
            const parent = createMockShape('parent', 'board');
            const child = createMockShape('child');
            child.parent = parent;

            mockPenpot.currentPage.getShapeById.mockReturnValue(child);

            const result = await getParentElementTool({ shapeId: 'child' });

            expect(result.success).not.toBe(false);
            if (result.payload && 'parentId' in result.payload) {
                expect(result.payload.parentId).toBe('parent');
                expect(result.payload.parentName).toBe('Shape parent');
            }
        });

        it('should return null parent if root', async () => {
            const shape = createMockShape('root');
            shape.parent = null;

            mockPenpot.currentPage.getShapeById.mockReturnValue(shape);

            const result = await getParentElementTool({ shapeId: 'root' });

            expect(result.success).not.toBe(false);
            if (result.payload && 'parentId' in result.payload) {
                expect(result.payload.parentId).toBeNull();
            }
        });
    });
});
