/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureInteractionFlow, applyAnimationToSelection } from '../mainHandlers';

describe('interactionTools', () => {
    const originalPenpot = (globalThis as any).penpot;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        (globalThis as any).penpot = originalPenpot;
    });

    describe('configureInteractionFlow', () => {
        it('creates a new flow for a board', async () => {
            const board = { id: 'b1', type: 'board', name: 'Board 1' };
            const mockFlow = { name: 'My Flow', startingBoard: board };

            (globalThis as any).penpot = {
                currentPage: {
                    getShapeById: (id: string) => id === 'b1' ? board : null,
                    findShapes: () => [board],
                    flows: [],
                    createFlow: vi.fn().mockReturnValue(mockFlow),
                },
            };

            const resp = await configureInteractionFlow({ boardId: 'b1', flowName: 'My Flow' });

            expect(resp.success).toBeTruthy();
            expect((globalThis as any).penpot.currentPage.createFlow).toHaveBeenCalledWith('My Flow', board);
        });

        it('fails if board not found', async () => {
            (globalThis as any).penpot = {
                currentPage: {
                    getShapeById: () => null,
                    findShapes: () => [],
                },
            };
            const resp = await configureInteractionFlow({ boardId: 'b1' });
            expect(resp.success).toBeFalsy();
        });
    });

    describe('applyAnimationToSelection', () => {
        it('updates animation on existing interactions', async () => {
            const addInteractionMock = vi.fn();
            const interactionsArray = [
                { trigger: 'click', action: { type: 'navigate-to', destination: 'b2' } }
            ];
            const shape: any = {
                id: 's1',
                addInteraction: addInteractionMock,
            };
            Object.defineProperty(shape, 'interactions', {
                get: () => interactionsArray,
                set: () => {
                    throw new Error('Mock interactions are read-only');
                },
                configurable: true,
            });

            (globalThis as any).penpot = {
                selection: [shape],
                currentPage: { findShapes: () => [shape] },
            };

            const resp = await applyAnimationToSelection({
                animationType: 'slide',
                direction: 'left',
                duration: 300,
                easing: 'ease-in',
            });

            expect(resp.success).toBeTruthy();
            const updatedAnimation = (shape.interactions[0].action as any).animation;
            expect(updatedAnimation).toEqual({
                type: 'slide',
                direction: 'left',
                duration: 300,
                easing: 'ease-in',
                way: 'in',
                offsetEffect: false,
            });
        });

        it('ignores shapes without interactions', async () => {
            const addInteractionMock = vi.fn();
            const shape = {
                id: 's2',
                interactions: [],
                addInteraction: addInteractionMock,
            };

            (globalThis as any).penpot = {
                selection: [shape],
                currentPage: { findShapes: () => [shape] },
            };

            const resp = await applyAnimationToSelection({
                animationType: 'dissolve',
            });

            expect(resp.success).toBeTruthy();
            expect(addInteractionMock).not.toHaveBeenCalled();
            // Should report 0 updated
            expect((resp.payload as any).interactionsUpdated).toBe(0);
        });
    });
});
