export function handleAlignShapes(payload) {
  const { shapeIds, axis, direction } = payload || {};

  try {
    if (!shapeIds || !Array.isArray(shapeIds) || shapeIds.length < 2) {
      throw new Error('At least 2 shape IDs are required to align');
    }

    const shapes = shapeIds.map((id) => {
      const shape = penpot.currentPage?.getShapeById(id);
      if (!shape) {
        throw new Error(`Shape with ID ${id} not found`);
      }
      return shape;
    });

    if (axis === 'horizontal') {
      if (!['left', 'center', 'right'].includes(direction)) {
        throw new Error('Horizontal alignment requires direction: left, center, or right');
      }
      penpot.alignHorizontal(shapes, direction);
    } else {
      if (!['top', 'center', 'bottom'].includes(direction)) {
        throw new Error('Vertical alignment requires direction: top, center, or bottom');
      }
      penpot.alignVertical(shapes, direction);
    }

    return {
      success: true,
      message: `Shapes aligned (${axis} ${direction}) successfully`,
      payload: {
        shapeIds,
        axis,
        direction,
      },
    };
  } catch (error) {
    console.error('error aligning shapes:', error);
    return {
      success: false,
      message: `error aligning shapes: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleDistributeShapes(payload) {
  const { shapeIds, axis } = payload || {};

  try {
    if (!shapeIds || !Array.isArray(shapeIds) || shapeIds.length < 2) {
      throw new Error('At least 2 shape IDs are required to distribute');
    }

    const shapes = shapeIds.map((id) => {
      const shape = penpot.currentPage?.getShapeById(id);
      if (!shape) {
        throw new Error(`Shape with ID ${id} not found`);
      }
      return shape;
    });

    if (axis === 'horizontal') {
      penpot.distributeHorizontal(shapes);
    } else {
      penpot.distributeVertical(shapes);
    }

    return {
      success: true,
      message: `Shapes distributed (${axis}) successfully`,
      payload: {
        shapeIds,
        axis,
      },
    };
  } catch (error) {
    console.error('error distributing shapes:', error);
    return {
      success: false,
      message: `error distributing shapes: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
