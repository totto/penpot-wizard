import { curateShapeOutput } from '../utils';

export function handleBringToFrontShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    const parent = shape.parent;
    if (parent?.children?.length > 1 && shape.parentIndex < parent.children.length - 1) {
      shape.setParentIndex(parent.children.length - 1);
    }

    return {
      success: true,
      message: 'Shape brought to front successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error bringing shape to front:', error);
    return {
      success: false,
      message: `error bringing shape to front ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleBringForwardShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    const parent = shape.parent;
    if (parent?.children?.length > 1) {
      const nextIndex = Math.min(shape.parentIndex + 1, parent.children.length - 1);
      if (nextIndex !== shape.parentIndex) {
        shape.setParentIndex(nextIndex);
      }
    }

    return {
      success: true,
      message: 'Shape brought forward successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error bringing shape forward:', error);
    return {
      success: false,
      message: `error bringing shape forward ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleSendToBackShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    if (shape.parentIndex > 0) {
      shape.setParentIndex(0);
    }

    return {
      success: true,
      message: 'Shape sent to back successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error sending shape to back:', error);
    return {
      success: false,
      message: `error sending shape to back ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleSendBackwardShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    if (shape.parentIndex > 0) {
      shape.setParentIndex(shape.parentIndex - 1);
    }

    return {
      success: true,
      message: 'Shape sent backward successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error sending shape backward:', error);
    return {
      success: false,
      message: `error sending shape backward ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
