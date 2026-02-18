import { pathCommandsToSvgString, curateShapeOutput, convertToBoard } from './utils';
import { PenpotShapeType } from '../types/types';

function setParamsToShape(shape, params) {
  const { parentX, parentY, parentId, zIndex, width, height, layoutChild, layoutCell, ...rest } = params;

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

  // Solo manipular el parent cuando se pide explícitamente (parentId en params)
  if ('parentId' in params) {
    let parentShape = null;
    if (parentId) {
      parentShape = penpot.currentPage?.getShapeById(parentId);
    }
    if (!parentShape) {
      parentShape = penpot.currentPage?.root || null;
    }
    if (parentShape) {
      const insertIndex = typeof zIndex === 'number'
        ? zIndex
        : (parentShape.children?.length ?? 0);
      if (typeof parentShape.insertChild === 'function') {
        parentShape.insertChild(insertIndex, shape);
      } else if (typeof parentShape.appendChild === 'function') {
        parentShape.appendChild(shape);
      }
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
}

function setParamsToBoard(board, params) {
  const { flex, grid, horizontalSizing, verticalSizing, ...rest } = params;
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

  if (horizontalSizing !== undefined) shape.horizontalSizing = horizontalSizing;
  if (verticalSizing !== undefined) shape.verticalSizing = verticalSizing;

  setParamsToShape(shape, rest);
}

function applyModifyParamsToShape(shape, params = {}) {
  if (!params || typeof params !== 'object') {
    return shape;
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
    setParamsToBoard(shape, params);
    return shape;
  }
  setParamsToShape(shape, params);
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

    const normalizedShapes = shapes.map((shapeRef) =>
      typeof shapeRef === 'string' ? { shapeId: shapeRef } : shapeRef
    );
    const hasZIndex = normalizedShapes.some((shapeRef) => typeof shapeRef.zIndex === 'number');
    const orderedShapes = hasZIndex
      ? normalizedShapes.slice().sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      : normalizedShapes;

    const component = penpot.library.local.createComponent(orderedShapes.map(shapeRef => {
      const shape = penpot.currentPage?.getShapeById(shapeRef.shapeId);
      if (!shape) {
        throw new Error(`Shape with ID ${shapeRef.shapeId} not found`);
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
  const { shapeIds, ...properties } = payload || {};

  try {
    let group;

    if (Array.isArray(shapeIds) && shapeIds.length > 0) {
      const shapeRefs = shapeIds.map((shapeRef) =>
        typeof shapeRef === 'string' ? { shapeId: shapeRef } : shapeRef
      );
      const shapesToGroup = shapeRefs.map((shapeRef) => {
        const shape = penpot.currentPage?.getShapeById(shapeRef.shapeId);
        if (!shape) {
          throw new Error(`Shape with ID ${shapeRef.shapeId} not found`);
        }
        return shape;
      });
      group = penpot.group(shapesToGroup);
    } else {
      try {
        group = penpot.group([]);
      } catch {
        group = null;
      }

      if (!group) {
        const placeholder = penpot.createRectangle();
        placeholder.resize(1, 1);
        const root = penpot.currentPage?.root;
        if (root && typeof root.appendChild === 'function') {
          root.appendChild(placeholder);
        }
        group = penpot.group([placeholder]);
        placeholder.remove();
      }
    }

    if (!group) {
      throw new Error('Failed to create group');
    }

    setParamsToShape(group, properties);

    return {
      success: true,
      message: 'Group created successfully',
      payload: {
        group: curateShapeOutput(group),
        shapes: Array.isArray(shapeIds)
          ? shapeIds.map((shapeRef) => {
            const shapeId = typeof shapeRef === 'string' ? shapeRef : shapeRef.shapeId;
            const shape = penpot.currentPage?.getShapeById(shapeId);
            return shape ? curateShapeOutput(shape) : { id: shapeId };
          })
          : undefined,
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
    // Get all shape objects first (optional)
    const shapeRefs = Array.isArray(shapes)
      ? shapes.map((shapeRef) =>
        typeof shapeRef === 'string' ? { shapeId: shapeRef } : shapeRef
      )
      : [];
    const shapeObjects = shapeRefs
      .map(shapeRef => {
        const shape = penpot.currentPage?.getShapeById(shapeRef.shapeId);
        if (!shape) {
          throw new Error(`Shape with ID ${shapeRef.shapeId} not found`);
        }
        return { shape, shapeRef };
      })
      ;

    // Create the board
    let board = penpot.createBoard();

    if (!board) {
      throw new Error('Failed to create board');
    }

    // Apply properties to the board
    setParamsToBoard(board, properties);

    // Move all shapes into the board
    shapeObjects.forEach(({ shape, shapeRef }) => {
      const insertIndex = typeof shapeRef.zIndex === 'number'
        ? shapeRef.zIndex
        : (board.children?.length ?? 0);
      if (typeof board.insertChild === 'function') {
        board.insertChild(insertIndex, shape);
      } else {
        board.appendChild(shape);
      }
    });

    return {
      success: true,
      message: 'Board created successfully',
      payload: {
        board: curateShapeOutput(board),
        shapes: shapeObjects.map(({ shape }) => curateShapeOutput(shape)),
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
      setParamsToBoard(board, properties);
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

function convertContainerToComponent(container, containerType) {
  const children = container.children && Array.isArray(container.children)
    ? [...container.children]
    : [];
  if (children.length === 0) {
    throw new Error(`${containerType} has no children to convert`);
  }

  const parent = container.parent;
  const insertIndex = container.parentIndex ?? 0;
  const containerX = container.x;
  const containerY = container.y;

  const component = penpot.library.local.createComponent(children);
  if (!component || !component.mainInstance()) {
    throw new Error(`Failed to create component from ${containerType}`);
  }

  const instance = component.instance();
  container.remove();

  if (parent) {
    if (typeof parent.insertChild === 'function') {
      parent.insertChild(insertIndex, instance);
    } else if (typeof parent.appendChild === 'function') {
      parent.appendChild(instance);
    }
  }

  instance.x = containerX;
  instance.y = containerY;

  return component;
}

export function handleConvertGroupToComponent(payload) {
  const { groupId, name, ...properties } = payload || {};

  try {
    const group = penpot.currentPage?.getShapeById(groupId);
    if (!group) {
      throw new Error(`Shape with ID ${groupId} not found`);
    }
    if (group.type !== PenpotShapeType.GROUP) {
      throw new Error(`Shape with ID ${groupId} is not a group`);
    }

    const component = convertContainerToComponent(group, 'group');

    if (name) {
      component.name = name;
    }
    if (properties && Object.keys(properties).length > 0) {
      setParamsToBoard(component.mainInstance(), properties);
    }

    return {
      success: true,
      message: 'Group converted to component successfully',
      payload: {
        component,
        instance: curateShapeOutput(component.instance()),
      },
    };
  } catch (error) {
    console.error('error converting group to component:', error);
    return {
      success: false,
      message: `error converting group to component ${groupId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleConvertBoardToComponent(payload) {
  const { boardId, name, ...properties } = payload || {};

  try {
    const board = penpot.currentPage?.getShapeById(boardId);
    if (!board) {
      throw new Error(`Shape with ID ${boardId} not found`);
    }
    if (board.type !== PenpotShapeType.BOARD) {
      throw new Error(`Shape with ID ${boardId} is not a board`);
    }

    const component = convertContainerToComponent(board, 'board');

    if (name) {
      component.name = name;
    }
    if (properties && Object.keys(properties).length > 0) {
      setParamsToBoard(component.mainInstance(), properties);
    }

    return {
      success: true,
      message: 'Board converted to component successfully',
      payload: {
        component,
        instance: curateShapeOutput(component.instance()),
      },
    };
  } catch (error) {
    console.error('error converting board to component:', error);
    return {
      success: false,
      message: `error converting board to component ${boardId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

const BOOLEAN_TYPES = ['union', 'difference', 'exclude', 'intersection'];

export function handleCreateBoolean(payload) {
  const { boolType, shapeIds, ...params } = payload || {};

  try {
    if (!BOOLEAN_TYPES.includes(boolType)) {
      throw new Error(`Invalid boolType. Must be one of: ${BOOLEAN_TYPES.join(', ')}`);
    }
    if (!shapeIds || !Array.isArray(shapeIds) || shapeIds.length < 2) {
      throw new Error('At least 2 shape IDs are required for boolean operation');
    }

    const shapes = shapeIds.map((id) => {
      const shape = penpot.currentPage?.getShapeById(id);
      if (!shape) {
        throw new Error(`Shape with ID ${id} not found`);
      }
      return shape;
    });

    const booleanShape = penpot.createBoolean(boolType, shapes);
    if (!booleanShape) {
      throw new Error(`Failed to create boolean shape (${boolType})`);
    }

    if (params && Object.keys(params).length > 0) {
      setParamsToShape(booleanShape, params);
    }

    return {
      success: true,
      message: `Boolean shape (${boolType}) created successfully`,
      payload: {
        shape: curateShapeOutput(booleanShape),
      },
    };
  } catch (error) {
    console.error('error creating boolean shape:', error);
    return {
      success: false,
      message: `error creating boolean shape: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleUngroupShape(payload) {
  const { groupId } = payload || {};

  try {
    const group = penpot.currentPage?.getShapeById(groupId);
    if (!group) {
      throw new Error(`Shape with ID ${groupId} not found`);
    }
    if (group.type !== PenpotShapeType.GROUP) {
      throw new Error(`Shape with ID ${groupId} is not a group. Use this tool only for groups.`);
    }

    penpot.ungroup(group);

    return {
      success: true,
      message: 'Group ungrouped successfully',
      payload: {
        groupId,
        ungrouped: true,
      },
    };
  } catch (error) {
    console.error('error ungrouping shape:', error);
    return {
      success: false,
      message: `error ungrouping group ${groupId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

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

function buildAnimation(anim) {
  if (!anim) return undefined;
  const base = { duration: anim.duration || 300, easing: anim.easing || 'linear' };
  if (anim.type === 'dissolve') {
    return { type: 'dissolve', ...base };
  }
  if (anim.type === 'slide') {
    return { type: 'slide', way: anim.way || 'out', direction: anim.direction || 'right', ...base, offsetEffect: anim.offsetEffect };
  }
  if (anim.type === 'push') {
    return { type: 'push', direction: anim.direction || 'right', ...base };
  }
  return { type: 'dissolve', duration: 300, easing: 'linear' };
}

function buildAction(payload) {
  const action = payload.action;
  const page = penpot.currentPage;

  if (action.type === 'navigate-to') {
    const destination = page?.getShapeById(action.destinationBoardId);
    if (!destination || destination.type !== PenpotShapeType.BOARD) {
      throw new Error(`Board with ID ${action.destinationBoardId} not found`);
    }
    const a = { type: 'navigate-to', destination };
    if (action.preserveScrollPosition !== undefined) a.preserveScrollPosition = action.preserveScrollPosition;
    if (action.animation) a.animation = buildAnimation(action.animation);
    return a;
  }

  if (action.type === 'open-overlay' || action.type === 'toggle-overlay') {
    const destination = page?.getShapeById(action.destinationBoardId);
    
    if (!destination || destination.type !== PenpotShapeType.BOARD) {
      throw new Error(`Board with ID ${action.destinationBoardId} not found`);
    }

    const a = { 
      type: action.type, 
      destination,
      position: action.position || 'center',
      manualPositionLocation: action.position === 'manual' && action.manualPositionLocation
      ? action.manualPositionLocation
      : { x: 0, y: 0 }, 
    };

    if (action.relativeToShapeId) {
      const rel = page?.getShapeById(action.relativeToShapeId);
      if (rel) a.relativeTo = rel;
    }

    if (action.closeWhenClickOutside !== undefined) a.closeWhenClickOutside = action.closeWhenClickOutside;
    if (action.addBackgroundOverlay !== undefined) a.addBackgroundOverlay = action.addBackgroundOverlay;
    if (action.animation) a.animation = buildAnimation(action.animation);
    return a;
  }

  if (action.type === 'close-overlay') {
    const a = { type: 'close-overlay', animation: buildAnimation(action.animation) || { type: 'dissolve', duration: 300, easing: 'linear' } };
    if (action.destinationBoardId) {
      const destination = page?.getShapeById(action.destinationBoardId);
      if (destination) a.destination = destination;
    }
    return a;
  }

  if (action.type === 'previous-screen') {
    return { type: 'previous-screen' };
  }

  if (action.type === 'open-url') {
    return { type: 'open-url', url: action.url };
  }

  throw new Error(`Unknown action type: ${action?.type}`);
}

export function handleAddInteraction(payload) {
  const { shapeId, trigger, delay, action } = payload || {};

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    const builtAction = buildAction(payload);
    const delayMs = trigger === 'after-delay' ? (delay ?? 0) : undefined;

    shape.addInteraction(trigger, builtAction, delayMs);

    return {
      success: true,
      message: `Interaction added (${trigger} -> ${action?.type})`,
      payload: {
        shapeId,
        trigger,
        actionType: action?.type,
      },
    };
  } catch (error) {
    console.error('error adding interaction:', error);
    return {
      success: false,
      message: `error adding interaction: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleCreateFlow(payload) {
  const { name, boardId } = payload || {};

  try {
    const board = penpot.currentPage?.getShapeById(boardId);
    if (!board) {
      throw new Error(`Board with ID ${boardId} not found`);
    }
    if (board.type !== PenpotShapeType.BOARD) {
      throw new Error(`Shape with ID ${boardId} is not a board`);
    }

    const flow = penpot.currentPage.createFlow(name, board);

    return {
      success: true,
      message: `Flow "${name}" created successfully`,
      payload: {
        flowName: flow.name,
        startingBoardId: board.id,
      },
    };
  } catch (error) {
    console.error('error creating flow:', error);
    return {
      success: false,
      message: `error creating flow: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleRemoveFlow(payload) {
  const { flowName } = payload || {};

  try {
    const flow = penpot.currentPage?.flows?.find((f) => f.name === flowName);
    if (!flow) {
      throw new Error(`Flow with name "${flowName}" not found`);
    }

    penpot.currentPage.removeFlow(flow);

    return {
      success: true,
      message: `Flow "${flowName}" removed successfully`,
      payload: {
        flowName,
        removed: true,
      },
    };
  } catch (error) {
    console.error('error removing flow:', error);
    return {
      success: false,
      message: `error removing flow: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleModifyBoard(payload) {
  const { boardId, properties } = payload;

  try {
    let board = penpot.currentPage?.getShapeById(boardId);
    if (!board) {
      throw new Error(`Board with ID ${boardId} not found`);
    }
    if (board.type !== PenpotShapeType.BOARD) {
      throw new Error(`Shape with ID ${boardId} is not a board`);
    }

    board = applyModifyParamsToShape(board, properties || {});

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
      message: `error modifying board ${boardId}: ${error}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleModifyComponent(payload) {
  const { componentId, properties } = payload;

  try {
    const { name, path, ...boardProps } = properties || {};
    let component = penpot.library?.local?.components?.find((comp) => comp.id === componentId);

    if (!component) {
      const shape = penpot.currentPage?.getShapeById(componentId);
      if (!shape) {
        throw new Error(`Component with ID ${componentId} not found`);
      }
      component = shape.component?.();
    }

    if (!component) {
      throw new Error(`Component with ID ${componentId} not found`);
    }

    if (typeof name === 'string') {
      component.name = name;
    }
    if (typeof path === 'string') {
      component.path = path;
    }

    const mainInstance = component.mainInstance?.();
    if (!mainInstance) {
      throw new Error(`Component with ID ${componentId} does not have a main instance`);
    }

    if (boardProps && Object.keys(boardProps).length > 0) {
      applyModifyParamsToShape(mainInstance, boardProps);
    }

    return {
      success: true,
      message: 'Component modified successfully',
      payload: {
        component,
        mainInstance: curateShapeOutput(mainInstance),
      },
    };
  } catch (error) {
    console.error('error modifying component:', error);
    return {
      success: false,
      message: `error modifying component ${componentId}: ${error}`,
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

    shape = applyModifyParamsToShape(shape, params);

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
    const appliedKeys = [];
    Object.keys(rangeProps).forEach((key) => {
      const value = rangeProps[key];
      if (value === null) {
        delete range[key];
        appliedKeys.push(key);
      } else if (value !== undefined) {
        range[key] = value;
        appliedKeys.push(key);
      }
    });

    const valueMatches = (a, b) => {
      if (a === b) return true;
      if (a == null || b == null) return false;
      return String(a).trim() === String(b).trim();
    };

    const rejectedProps = [];
    for (const key of appliedKeys) {
      if (key === 'characters') continue;
      const proposedValue = rangeProps[key];
      if (proposedValue == null) continue;
      const currentValue = shape[key];
      const ok =
        currentValue === 'mixed' ||
        valueMatches(currentValue, proposedValue);
      if (!ok) {
        rejectedProps.push({
          key,
          proposed: proposedValue,
          actual: currentValue,
        });
      }
    }

    if (rejectedProps.length > 0) {
      const msgs = rejectedProps.map(
        (r) =>
          `${r.key} '${r.proposed}' rejected (actual: ${r.actual})`,
      );
      return {
        success: false,
        message: `Text range modification failed: ${msgs.join('; ')}`,
        payload: {
          error: msgs.join('. '),
          rejectedProps,
          shape: curateShapeOutput(shape),
        },
      };
    }

    const curated = curateShapeOutput(shape);
    for (const key of appliedKeys) {
      if (key === 'characters') continue;
      const proposedValue = rangeProps[key];
      const currentValue = shape[key];
      curated[key] =
        currentValue === 'mixed'
          ? 'mixed'
          : proposedValue != null && valueMatches(currentValue, proposedValue)
            ? proposedValue
            : currentValue;
    }

    return {
      success: true,
      message: 'Text range modified successfully',
      payload: {
        shape: curated,
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
      setParamsToShape(clonedShape, params);
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
