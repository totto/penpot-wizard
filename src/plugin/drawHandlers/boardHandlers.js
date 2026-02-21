import { curateShapeOutput } from '../utils';
import { PenpotShapeType } from '../../types/types';
import { applyModifyParamsToShape } from './helpers';

export function handleModifyBoard(payload) {
  const { shapeId, propertiesToModify, propertiesToRemove } = payload;

  try {
    let board = penpot.currentPage?.getShapeById(shapeId);
    if (!board) {
      throw new Error(`Board with ID ${shapeId} not found`);
    }
    if (board.type !== PenpotShapeType.BOARD) {
      throw new Error(`Shape with ID ${shapeId} is not a board`);
    }

    board = applyModifyParamsToShape(board, propertiesToModify || {}, propertiesToRemove || []);

    return {
      success: true,
      message: 'Board modified successfully',
      payload: {
        board: curateShapeOutput(board),
      },
    };
  } catch (error) {
    console.error('error modifying board:', error);
    return {
      success: false,
      message: `error modifying board ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
