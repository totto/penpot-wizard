import { pathCommandsToSvgString } from './utils';
import { ClientQueryType, MessageSourceName, PenpotShapeType } from '../types/types';

function setParamsToShape(shape, params) {
  const { x, y, parentId, width, height, fills, strokes, shadows, ...rest } = params;
  
  // Assign fills directly if provided (fills come already properly defined)
  if (fills && fills.length > 0) {
    shape.fills = fills;
  }

  // Assign strokes directly if provided (strokes come already properly defined)
  if (strokes && strokes.length > 0) {
    shape.strokes = strokes;
  }

  // Assign shadows directly if provided (shadows come already properly defined)
  if (shadows && shadows.length > 0) {
    shape.shadows = shadows;
  }

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

  const pluginResponse = {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.DRAW_SHAPE,
    messageId: '',
    message: '',
    success: true,
  };

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
      default:
        throw new Error('Invalid shape type');
    }

    if (!newShape) {
      throw new Error('Failed to create shape');
    }

    setParamsToShape(newShape, params);

    return {
      ...pluginResponse,
      message: 'Shape drawn successfully',
      payload: {
        shape: newShape,
      },
    };
  } catch (error) {
    console.error('error drawing shape:', error);
    return {
      ...pluginResponse,
      success: false,
      message: `error drawing shape ${shapeType}: ${error}`,
    };
  }
}

export function handleCreateComponent(payload) {
  const { shapes, ...properties } = payload;

  const pluginResponse = {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.CREATE_COMPONENT,
    messageId: '',
    message: '',
    success: true,
  };

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

    setParamsToShape(component.mainInstance(), properties);

    return {
      ...pluginResponse,
      message: 'Component created successfully',
      payload: {
        component: component,
      },
    };
  } catch (error) {
    console.error('error creating component:', error);
    return {
      ...pluginResponse,
      success: false,
      message: `error creating component: ${error}`,
    };
  }
}

export function handleCreateGroup(payload) {
  const { shapes, ...properties } = payload;

  const pluginResponse = {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.CREATE_GROUP,
    messageId: '',
    message: '',
    success: true,
  };

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
      ...pluginResponse,
      message: 'Group created successfully',
      payload: {
        group: group,
      },
    };
  } catch (error) {
    console.error('error creating group:', error);
    return {
      ...pluginResponse,
      success: false,
      message: `error creating group: ${error}`,
    };
  }
}

export function handleModifyShape(payload) {
  const { shapeId, params } = payload;

  const pluginResponse = {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.MODIFY_SHAPE,
    messageId: '',
    message: '',
    success: true,
  };

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    // Handle path content modification (convert path commands to SVG string)
    let pathContent;
    if (params.content && shape.type === PenpotShapeType.PATH) {
      pathContent = pathCommandsToSvgString(params.content);
    }

    // Apply modifications using the same logic as setParamsToShape
    const { x, y, parentId, width, height, fills, strokes, shadows, content, characters, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform, textDecoration, direction, align, verticalAlign, ...rest } = params;
    
    // Assign fills directly if provided
    if (fills && fills.length > 0) {
      shape.fills = fills;
    }

    // Assign strokes directly if provided
    if (strokes && strokes.length > 0) {
      shape.strokes = strokes;
    }

    // Assign shadows directly if provided
    if (shadows && shadows.length > 0) {
      shape.shadows = shadows;
    }

    // Handle resize
    if (width && height) {
      shape.resize(width, height);
    } else if (width) {
      shape.resize(width, shape.height);
    } else if (height) {
      shape.resize(shape.width, height);
    }

    // Handle path content
    if (pathContent !== undefined && shape.type === PenpotShapeType.PATH) {
      shape.content = pathContent;
    }

    // Handle text-specific properties using generic assignment (same approach as setParamsToShape)
    if (shape.type === PenpotShapeType.TEXT) {
      const textProps = {
        characters,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        lineHeight,
        letterSpacing,
        textTransform,
        textDecoration,
        direction,
        align,
        verticalAlign,
      };
      
      Object.keys(textProps).forEach((key) => {
        const value = textProps[key];
        if (value !== undefined) {
          shape[key] = value;
        }
      });
    }

    // Handle other properties
    Object.keys(rest).forEach((key) => {
      const value = rest[key];
      if (value !== undefined) {
        shape[key] = value;
      }
    });

    // Handle position
    if (x !== undefined) {
      shape.x = x;
    }
    if (y !== undefined) {
      shape.y = y;
    }

    // Handle parent change
    if (parentId !== undefined) {
      const parent = penpot.currentPage?.getShapeById(parentId);
      if (parent && parent.type === PenpotShapeType.BOARD) {
        parent.appendChild(shape);
      }
    }

    return {
      ...pluginResponse,
      message: 'Shape modified successfully',
      payload: {
        shape: shape,
      },
    };
  } catch (error) {
    console.error('error modifying shape:', error);
    return {
      ...pluginResponse,
      success: false,
      message: `error modifying shape ${shapeId}: ${error}`,
    };
  }
}

export function handleDeleteShape(payload) {
  const { shapeId } = payload;

  const pluginResponse = {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.DELETE_SHAPE,
    messageId: '',
    message: '',
    success: true,
  };

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    // Remove the shape using Penpot API
    shape.remove();

    return {
      ...pluginResponse,
      message: 'Shape deleted successfully',
      payload: {
        shapeId: shapeId,
        deleted: true,
      },
    };
  } catch (error) {
    console.error('error deleting shape:', error);
    return {
      ...pluginResponse,
      success: false,
      message: `error deleting shape ${shapeId}: ${error}`,
    };
  }
}

