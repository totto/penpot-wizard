import { pathCommandsToSvgString, curateShapeOutput, convertToBoard } from './utils';
import { PenpotShapeType } from '../types/types';

function setParamsToShape(shape, params) {
  const { x, y, parentX, parentY, parentId, width, height, layoutChild, layoutCell, ...rest } = params;

  if (width && height) {
    shape.resize(width, height);
  }

  Object.keys(rest).forEach((key) => {
    const value = rest[key];
    if (value === 'auto') {
      shape[key] = null;
    }
    else if (value !== undefined) {
      shape[key] = value;
    }
    else {
      delete shape[key];
    }
  });

  if (parentId) {
    const parent = penpot.currentPage?.getShapeById(parentId);
    if (parent) {
      parent.appendChild(shape);
    }
  }

  if (layoutCell) {
    const parent = shape.parent;
    if (parent && parent.grid) {
      parent.grid.appendChild(shape, layoutCell.row, layoutCell.column);
      Object.keys(layoutCell).forEach((key) => {
        if (layoutCell[key] !== undefined) {
          shape.layoutCell[key] = layoutCell[key];
        }
      });

    }
  }
  
  if (layoutChild) {
    const parent = shape.parent;
    if (parent && shape.layoutChild) {
      if (parent.flex) {
        parent.flex.appendChild(shape);
      }
      if (layoutChild.zIndex !== undefined) {
        shape.setParentIndex(layoutChild.zIndex);
      }
      Object.keys(layoutChild).forEach((key) => {
        if (layoutChild[key] === 'auto') {
          shape.layoutChild[key] = null;
        }
        else if (layoutChild[key] && key !== 'zIndex') {
          shape.layoutChild[key] = layoutChild[key];
        }
      });
    }
  }

  if (parentX !== undefined) {
    shape.parentX = parentX;
  }
  if (parentY !== undefined) {
    shape.parentY = parentY;
  }
  return shape;
}

function setParamsToBoard(board, params) {
  const { flex, grid, ...rest } = params;
  let shape = board;

  if (flex) {
    const flexLayout = shape.addFlexLayout();
    Object.keys(flex).forEach((key) => {
      flexLayout[key] = flex[key];
    });
  }

  if (grid) {
    const { rows, columns, ...gridProps } = grid;
    const gridLayout = shape.addGridLayout();
    Object.keys(gridProps).forEach((key) => {
      if (gridProps[key] !== undefined) {
        gridLayout[key] = gridProps[key];
      }
    });
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        gridLayout.addRow(row.type, row.value);
      });
    }
    if (Array.isArray(columns)) {
      columns.forEach((column) => {
        gridLayout.addColumn(column.type, column.value);
      });
    }
  }

  shape = setParamsToShape(shape, rest);
  return shape;
}

export function handleDrawShape(payload) {
  const { shapeType, params } = payload;

  let newShape;
  try {
    switch (shapeType) {
      case PenpotShapeType.RECTANGLE:
        newShape = penpot.createRectangle();
        break;
      case PenpotShapeType.ELLIPSE:
        newShape = penpot.createEllipse();
        break;
      case PenpotShapeType.PATH:
        // Penpot path content only accepts SVG string; type def is narrower
        params.content = pathCommandsToSvgString(params.content);
        newShape = penpot.createPath();
        break;
      case PenpotShapeType.TEXT:
        newShape = penpot.createText(params.characters);
        delete params.characters;
        break;
      case PenpotShapeType.BOARD:
        newShape = penpot.createBoard();
        break;
      case PenpotShapeType.GROUP:
        newShape = penpot.currentPage?.getShapeById(params.shapeId);
        delete params.shapeId;
        break;
      case PenpotShapeType.COMPONENT:
        newShape = penpot.library?.local?.components.find(component => component.id === params.componentId);
        newShape = newShape.instance();
        delete params.componentId;
        break;
      default:
        throw new Error('Invalid shape type');
    }

    if (!newShape) {
      throw new Error('Failed to create shape');
    }

    if (params && Object.keys(params).length > 0) {
      newShape = setParamsToShape(newShape, params);
    }

    return {
      success: true,
      message: 'Shape drawn successfully',
      payload: {
        shape: curateShapeOutput(newShape),
      },
    };
  } catch (error) {
    console.error('error drawing shape:', error);
    return {
      success: false,
      message: `error drawing shape ${shapeType}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCreateComponent(payload) {
  const { shapes, name, ...properties } = payload;

  try {
    if (!shapes || shapes.length === 0) {
      throw new Error('No shapes provided to create component');
    }

    const component = penpot.library.local.createComponent(shapes.map(shapeId => {
      const shape = penpot.currentPage?.getShapeById(shapeId);
      if (!shape) {
        throw new Error(`Shape with ID ${shapeId} not found`);
      }
      return shape;
    }));

    if (!component || !component.mainInstance()) {
      throw new Error('Failed to create component');
    }

    component.name = name || component.name;

    setParamsToBoard(component.mainInstance(), properties);

    return {
      success: true,
      message: 'Component created successfully',
      payload: {
        component: component,
      },
    };
  } catch (error) {
    console.error('error creating component:', error);
    return {
      success: false,
      message: `error creating component: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCreateGroup(payload) {
  const { shapes, ...properties } = payload;

  try {
    if (!shapes || shapes.length === 0) {
      throw new Error('No shapes provided to create group');
    }

    const shapeObjects = shapes.map(shapeId => {
      const shape = penpot.currentPage?.getShapeById(shapeId);
      if (!shape) {
        throw new Error(`Shape with ID ${shapeId} not found`);
      }
      return shape;
    });

    // Create group using Penpot API
    let group = penpot.group(shapeObjects);

    if (!group) {
      throw new Error('Failed to create group');
    }

    group = setParamsToShape(group, properties);

    return {
      success: true,
      message: 'Group created successfully',
      payload: {
        group: curateShapeOutput(group),
      },
    };
  } catch (error) {
    console.error('error creating group:', error);
    return {
      success: false,
      message: `error creating group: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCreateBoard(payload) {
  const { shapes, ...properties } = payload;

  try {
    if (!shapes || shapes.length === 0) {
      throw new Error('No shapes provided to create board');
    }

    // Get all shape objects first
    const shapeObjects = shapes.map(shapeId => {
      const shape = penpot.currentPage?.getShapeById(shapeId);
      if (!shape) {
        throw new Error(`Shape with ID ${shapeId} not found`);
      }
      return shape;
    });

    // Create the board
    let board = penpot.createBoard();

    if (!board) {
      throw new Error('Failed to create board');
    }

    // Apply properties to the board
    board = setParamsToBoard(board, properties);

    // Move all shapes into the board
    shapeObjects.forEach(shape => {
      board.appendChild(shape);
    });

    return {
      success: true,
      message: 'Board created successfully',
      payload: {
        board: curateShapeOutput(board),
        shapes: shapeObjects.map(shape => curateShapeOutput(shape)),
      },
    };
  } catch (error) {
    console.error('error creating board:', error);
    return {
      success: false,
      message: `error creating board: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleConvertGroupToBoard(payload) {
  const { groupId, properties } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(groupId);
    if (!shape) {
      throw new Error(`Shape with ID ${groupId} not found`);
    }
    if (shape.type !== PenpotShapeType.GROUP && shape.type !== PenpotShapeType.BOARD) {
      throw new Error(`Shape with ID ${groupId} is not a group`);
    }

    let board = convertToBoard(shape);

    if (properties && Object.keys(properties).length > 0) {
      board = setParamsToBoard(board, properties);
    }

    return {
      success: true,
      message: 'Group converted to board successfully',
      payload: {
        board: curateShapeOutput(board),
      },
    };
  } catch (error) {
    console.error('error converting group to board:', error);
    return {
      success: false,
      message: `error converting group to board ${groupId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleModifyShape(payload) {
  const { shapeId, params } = payload;

  try {
    let shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    // Handle path content modification (convert path commands to SVG string)
    if (params.content && shape.type === PenpotShapeType.PATH) {
      params.content = pathCommandsToSvgString(params.content);
    }

    Object.keys(params).forEach((key) => {
      if (params[key] === null) {
        if (key === 'grid' && shape.grid?.remove) {
          shape.grid.remove();
        } else if (key === 'flex' && shape.flex?.remove) {
          shape.flex.remove();
        } else if (key === 'fills') {
          shape.fills = [];
        } else {
          delete shape[key];
        }
        delete params[key];
      }

      else if (key === 'grid' && shape.grid) {
        const { rows, columns, ...gridProps } = params.grid;
        Object.keys(gridProps).forEach((gridKey) => {
          if (gridProps[gridKey] !== undefined) {
            shape.grid[gridKey] = gridProps[gridKey];
          }
        });
        if (Array.isArray(rows)) {
          rows.forEach((row, index) => {
            shape.grid.setRow(index, row.type, row.value);
          });
        }
        if (Array.isArray(columns)) {
          columns.forEach((column, index) => {
            shape.grid.setColumn(index, column.type, column.value);
          });
        }
        delete params.grid;
      }

      else if (key === 'flex' && shape.flex) {
        Object.keys(params.flex).forEach((flexKey) => {
          if (params.flex[flexKey] !== undefined) {
            shape.flex[flexKey] = params.flex[flexKey];
          }
        });
        delete params.flex;
      }
    });

    if (shape.type === PenpotShapeType.BOARD) {
      shape = setParamsToBoard(shape, params);
    } else {
      shape = setParamsToShape(shape, params);
    }

    return {
      success: true,
      message: 'Shape modified successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error modifying shape:', error);
    return {
      success: false,
      message: `error modifying shape ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleModifyTextRange(payload) {
  const { shapeId, start, end, props } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }
    if (shape.type !== PenpotShapeType.TEXT) {
      throw new Error(`Shape with ID ${shapeId} is not a text shape`);
    }

    const characters = typeof shape.characters === 'string' ? shape.characters : '';
    const textLength = characters.length;

    if (start > end) {
      throw new Error('Invalid range: start must be less than or equal to end');
    }
    if (start < 0 || end < 0 || end > textLength) {
      throw new Error(`Invalid range: must be within 0 and ${textLength}`);
    }

    const range = shape.getRange(start, end);
    if (!range) {
      throw new Error('Failed to get text range');
    }

    const rangeProps = props || {};
    Object.keys(rangeProps).forEach((key) => {
      const value = rangeProps[key];
      if (value === null) {
        delete range[key];
      } else if (value !== undefined) {
        range[key] = value;
      }
    });

    return {
      success: true,
      message: 'Text range modified successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error modifying text range:', error);
    return {
      success: false,
      message: `error modifying text range ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleRotateShape(payload) {
  const { shapeId, angle, center } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    if (center === undefined) {
      shape.rotate(angle);
    } else {
      shape.rotate(angle, center);
    }

    return {
      success: true,
      message: 'Shape rotated successfully',
      payload: {
        shape: curateShapeOutput(shape),
      },
    };
  } catch (error) {
    console.error('error rotating shape:', error);
    return {
      success: false,
      message: `error rotating shape ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCloneShape(payload) {
  const { shapeId, ...params } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    let clonedShape;

    const libraryComponent = shape.component();
    if (libraryComponent) {
      clonedShape = libraryComponent.instance();
    } else {
      clonedShape = shape.clone();
    }

    if (!clonedShape) {
      throw new Error(`Failed to clone shape ${shapeId}`);
    }

    if (params && Object.keys(params).length > 0) {
      clonedShape = setParamsToShape(clonedShape, params);
    }

    return {
      success: true,
      message: 'Shape cloned successfully',
      payload: {
        shape: curateShapeOutput(clonedShape),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `error cloning shape ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleBringToFrontShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    shape.bringToFront();

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

    shape.bringForward();

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

    shape.sendToBack();

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

    shape.sendBackward();

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

export function handleDeleteShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    // Remove the shape using Penpot API
    shape.remove();

    return {
      success: true,
      message: 'Shape deleted successfully',
      payload: {
        shapeId: shapeId,
        deleted: true,
      },
    };
  } catch (error) {
    console.error('error deleting shape:', error);
    return {
      success: false,
      message: `error deleting shape ${shapeId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
