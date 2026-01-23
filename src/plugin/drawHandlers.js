import { pathCommandsToSvgString, curateShapeOutput } from './utils';
import { ClientQueryType, MessageSourceName, PenpotShapeType, ToolResponse } from '../types/types';

function setParamsToShape(shape, params) {
  const { x, y, parentId, width, height, flex, grid, layoutChild, layoutCell, ...rest } = params;

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

  // Assign fills directly if provided (fills come already properly defined)
  if (width && height) {
    shape.resize(width, height);
  }

  Object.keys(rest).forEach((key) => {
    const value = rest[key];
    if (value !== undefined && key !== 'zIndex') {
      shape[key] = value;
    }
  });

  if (parentId) {
    const parent = penpot.currentPage?.getShapeById(parentId);
    if (parent && parent.type === PenpotShapeType.BOARD) {
      parent.appendChild(shape);

      if (layoutChild) {  
        Object.keys(layoutChild).forEach((key) => {
          if (layoutChild[key] && shape.layoutChild[key] !== 'auto') {
            shape.layoutChild[key] = layoutChild[key];
          }
        });
      }

      if (layoutCell && parent.grid) {
        parent.grid.appendChild(shape, layoutCell.row, layoutCell.column);
        Object.keys(layoutCell).forEach((key) => {
          if (layoutCell[key] !== undefined) {
            shape.layoutCell[key] = layoutCell[key];
          }
        });
      }
    }

  }
  
  if (x !== undefined) {
    shape.x = x;
  }
  if (y !== undefined) {
    shape.y = y;
  }
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
      setParamsToShape(newShape, params);
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

    setParamsToShape(component.mainInstance(), properties);

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
    const group = penpot.group(shapeObjects);

    if (!group) {
      throw new Error('Failed to create group');
    }

    setParamsToShape(group, properties);

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

export function handleModifyShape(payload) {
  const { shapeId, params } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    // Handle path content modification (convert path commands to SVG string)
    if (params.content && shape.type === PenpotShapeType.PATH) {
      params.content = pathCommandsToSvgString(params.content);
    }

    setParamsToShape(shape, params);

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
