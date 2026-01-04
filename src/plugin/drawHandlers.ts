import { pathCommandsToSvgString } from './utils';
import { Board, Fill, Shape, Shadow, Stroke, Text } from '@penpot/plugin-types';
import { ClientQueryType, DrawShapeQueryPayload, CreateComponentQueryPayload, ModifyShapeQueryPayload, DeleteShapeQueryPayload, MessageSourceName, PenpotShapeType, PluginResponseMessage, CreateGroupQueryPayload } from '../types/types';
import { PathShapeProperties, PenpotShapeProperties, TextShapeProperties, ModifyShapeProperties } from '@/types/shapeTypes';

function setParamsToShape(shape: Shape, params: PenpotShapeProperties) {
  const { x, y, parentId, width, height, fills, strokes, shadows, ...rest } = params;
  
  // Assign fills directly if provided (fills come already properly defined)
  if (fills && fills.length > 0) {
    shape.fills = fills as Fill[];
  }

  // Assign strokes directly if provided (strokes come already properly defined)
  if (strokes && strokes.length > 0) {
    shape.strokes = strokes as Stroke[];
  }

  // Assign shadows directly if provided (shadows come already properly defined)
  if (shadows && shadows.length > 0) {
    shape.shadows = shadows as Shadow[];
  }

  if (width && height) {
    shape.resize(width, height);
  }

  (Object.keys(rest) as Array<keyof typeof rest>).forEach((key) => {
    const value = rest[key];
    if (value !== undefined && key !== 'zIndex') {
      (shape as unknown as Record<string, unknown>)[key as string] = value as unknown;
    }
  });

  if (parentId) {
    const parent = penpot.currentPage?.getShapeById(parentId);
    console.log('parent', parent);
    if (parent && parent.type === PenpotShapeType.BOARD) {
      (parent as Board).appendChild(shape);
    }
  }
  
  if (x !== undefined) {
    shape.x = x;
  }
  if (y !== undefined) {
    shape.y = y;
  }

}

export function handleDrawShape( payload: DrawShapeQueryPayload): PluginResponseMessage {
  const { shapeType, params } = payload;

  const pluginResponse: PluginResponseMessage = {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.DRAW_SHAPE,
    messageId: '',
    message: '',
    success: true,
  };

  let newShape: Shape | Text | null;
  try {
    switch (shapeType) {
      case PenpotShapeType.RECTANGLE:
        newShape = penpot.createRectangle();
        break;
      case PenpotShapeType.ELLIPSE:
        newShape = penpot.createEllipse();
        break;
      case PenpotShapeType.PATH:
        // @ts-expect-error Penpot path content only accepts SVG string; type def is narrower
        (params as PathShapeProperties).content = pathCommandsToSvgString((params as PathShapeProperties).content);
        newShape = penpot.createPath();
        break;
      case PenpotShapeType.TEXT:
        newShape = penpot.createText((params as TextShapeProperties).characters);
        delete (params as Partial<TextShapeProperties>).characters;
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
    return {
      ...pluginResponse,
      success: false,
      message: `error drawing shape ${shapeType}: ${error}`,
    };
  }
}

export function handleCreateComponent(payload: CreateComponentQueryPayload): PluginResponseMessage {
  const { shapes, ...properties } = payload;

  const pluginResponse: PluginResponseMessage = {
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
      const shape = penpot.currentPage?.getShapeById(shapeId) as Shape;
      if (!shape) {
        throw new Error(`Shape with ID ${shapeId} not found`);
      }
      return shape;
    }));

    if (!component || !component.mainInstance()) {
      throw new Error('Failed to create component');
    }

    setParamsToShape(component.mainInstance(), properties as PenpotShapeProperties);

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

export function handleCreateGroup(payload: CreateGroupQueryPayload): PluginResponseMessage {
  const { shapes, ...properties } = payload;

  const pluginResponse: PluginResponseMessage = {
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
      const shape = penpot.currentPage?.getShapeById(shapeId) as Shape;
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

    setParamsToShape(group, properties as PenpotShapeProperties);

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

export function handleModifyShape(payload: ModifyShapeQueryPayload): PluginResponseMessage {
  const { shapeId, params } = payload;

  const pluginResponse: PluginResponseMessage = {
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
    let pathContent: string | undefined;
    if (params.content && shape.type === PenpotShapeType.PATH) {
      pathContent = pathCommandsToSvgString(params.content as PathShapeProperties['content']);
    }

    // Apply modifications using the same logic as setParamsToShape
    const { x, y, parentId, width, height, fills, strokes, shadows, content, characters, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform, textDecoration, direction, align, verticalAlign, ...rest } = params as ModifyShapeProperties;
    
    // Assign fills directly if provided
    if (fills && fills.length > 0) {
      shape.fills = fills as Fill[];
    }

    // Assign strokes directly if provided
    if (strokes && strokes.length > 0) {
      shape.strokes = strokes as Stroke[];
    }

    // Assign shadows directly if provided
    if (shadows && shadows.length > 0) {
      shape.shadows = shadows as Shadow[];
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
      (shape as unknown as { content: string }).content = pathContent;
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
      
      (Object.keys(textProps) as Array<keyof typeof textProps>).forEach((key) => {
        const value = textProps[key];
        if (value !== undefined) {
          (shape as unknown as Record<string, unknown>)[key as string] = value as unknown;
        }
      });
    }

    // Handle other properties
    (Object.keys(rest) as Array<keyof typeof rest>).forEach((key) => {
      const value = rest[key];
      if (value !== undefined) {
        (shape as unknown as Record<string, unknown>)[key as string] = value as unknown;
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
        (parent as Board).appendChild(shape);
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
    return {
      ...pluginResponse,
      success: false,
      message: `error modifying shape ${shapeId}: ${error}`,
    };
  }
}

export function handleDeleteShape(payload: DeleteShapeQueryPayload): PluginResponseMessage {
  const { shapeId } = payload;

  const pluginResponse: PluginResponseMessage = {
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
    return {
      ...pluginResponse,
      success: false,
      message: `error deleting shape ${shapeId}: ${error}`,
    };
  }
}
