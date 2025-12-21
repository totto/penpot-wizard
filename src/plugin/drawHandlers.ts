import { pathCommandsToSvgString } from './utils';
import { Board, Fill, Shape, Shadow, Stroke, Text } from '@penpot/plugin-types';
import { ClientQueryType, DrawShapeQueryPayload, CreateComponentQueryPayload, MessageSourceName, PenpotShapeType, PluginResponseMessage } from '../types/types';
import { PathShapeProperties, PenpotShapeProperties, TextShapeProperties } from '@/types/shapeTypes';

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

  if (x !== undefined) {
    shape.x = x;
  }
  if (y !== undefined) {
    shape.y = y;
  }

  if (parentId) {
    const parent = penpot.currentPage?.getShapeById(parentId);
    if (parent && parent.type === PenpotShapeType.BOARD) {
      (parent as Board).appendChild(shape);
    }
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
  const { shapes, name } = payload;

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

    if (!component) {
      throw new Error('Failed to create component');
    }
    component.name = name;

    return {
      ...pluginResponse,
      message: 'Component created successfully',
      payload: {
        component: component,
      },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      success: false,
      message: `error creating component: ${error}`,
    };
  }
}
