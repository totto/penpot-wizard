import { pathCommandsToSvgString } from './utils';
import { Board, Shape, Text } from '@penpot/plugin-types';
import { PenpotShapeType } from '../types/types';

function setParamsToShape(shape: Shape, params: any) {
  const { backgroundImage, parentId, color, width, height, ...rest } = params;
  
  if (color || backgroundImage) {
    shape.fills = [{fillColor: color || 'transparent', fillImage: backgroundImage || undefined  }] 
  }

  if (width && height) {
    shape.resize(width, height);
  }

  Object.keys(rest).forEach((key) => {
    if (rest[key] !== undefined) {
      (shape as any)[key] = rest[key];
    }
  });

  if (parentId) {
    const parent = penpot.currentPage?.getShapeById(parentId);
    if (parent && parent.type === PenpotShapeType.BOARD) {
      (parent as Board).appendChild(shape);
    }
  }
}

export function handleDrawShape(payload: any) {
  const { shapeType, params } = payload;

  try {
    let newShape: Shape | Text | null;
    switch (shapeType) {
      case PenpotShapeType.RECTANGLE:
        newShape = penpot.createRectangle();
        break;
      case PenpotShapeType.ELLIPSE:
        newShape = penpot.createEllipse();
        break;
      case PenpotShapeType.PATH:
        params.content = pathCommandsToSvgString(params.content) as any;
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
        throw new Error(`Invalid shape type: ${shapeType}`);
    }

    if (!newShape) {
      throw new Error(`Failed to create ${shapeType} shape`);
    }

    setParamsToShape(newShape, params);

    return {
      success: true,
      description: `${shapeType} successfully drawn`,
      data: {
        shapeCreated: newShape,
      },
    };
  } catch (error) {
    return {
      success: false,
      description: `${shapeType} unsuccessfully drawn, error: ${error}`,
      data: null,
    };
  }
}
