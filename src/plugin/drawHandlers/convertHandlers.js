import { curateShapeOutput } from '../utils';
import { PenpotShapeType } from '../../types/types';

export function handleConvertShapesToBoard(payload) {
  const { shapeIds, name } = payload || {};

  try {
    const shapes = shapeIds.map((id) => {
      const shape = penpot.currentPage?.getShapeById(id);
      if (!shape) {
        throw new Error(`Shape with ID ${id} not found`);
      }
      return shape;
    });

    const targetShape = shapes.length === 1 ? shapes[0] : penpot.group(shapes);

    if (!targetShape) {
      throw new Error('Failed to prepare shapes for conversion');
    }

    if (targetShape.type === PenpotShapeType.BOARD) {
      return {
        success: true,
        message: 'Shape is already a board',
        payload: {
          board: curateShapeOutput(targetShape),
        },
      };
    }

    const parent = targetShape.parent;
    const insertIndex = targetShape.parentIndex ?? 0;

    const board = penpot.createBoard();

    board.name = name || targetShape.name || 'Board';
    board.x = targetShape.x;
    board.y = targetShape.y;
    board.horizontalSizing = 'auto';
    board.verticalSizing = 'auto';

    board.resize(targetShape.width, targetShape.height);

    board.appendChild(targetShape);
    parent.insertChild(insertIndex, board);

    if (targetShape.type === PenpotShapeType.GROUP) {
      penpot.ungroup(targetShape);
    }

    return {
      success: true,
      message: 'Shapes converted to board successfully',
      payload: {
        board: curateShapeOutput(board),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error converting shapes to board: ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleConvertShapesToComponent(payload) {
  const { shapeIds, name } = payload || {};

  try {
    const shapes = shapeIds.map((id) => {
      const shape = penpot.currentPage?.getShapeById(id);
      if (!shape) {
        throw new Error(`Shape with ID ${id} not found`);
      }
      return shape;
    });
    if (shapes.length === 1 && shapes[0].component()) {
      console.log('shape is already a component', shapes[0].name, shapes[0].component(), shapes[0].isComponentInstance(), shapes[0].isComponentHead(), shapes[0].isComponentMainInstance(), shapes[0].isComponentRoot(), shapes[0].componentRoot());
      return {
        success: true,
        message: 'Shape is already a component',
        payload: {
          component: curateShapeOutput(shapes[0]),
        },
      };
    }

    const component = penpot.library.local.createComponent(shapes);

    component.name = name;

    return {
      success: true,
      message: 'Shapes converted to component successfully',
      payload: {
        component: curateShapeOutput(component),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error converting shapes to component: ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
