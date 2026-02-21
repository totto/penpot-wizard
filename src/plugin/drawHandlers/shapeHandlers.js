import { pathCommandsToSvgString, curateShapeOutput } from '../utils';
import { PenpotShapeType } from '../../types/types';
import { setParamsToShape, setParamsToBoard, applyModifyParamsToShape } from './helpers';

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

    if (params && Object.keys(params).length > 0) {
      if (shapeType === PenpotShapeType.BOARD) {
        setParamsToBoard(newShape, params);
      } else {
        setParamsToShape(newShape, params);
      }
    }

    if (newShape.parent) {
      newShape.parent.children.forEach((child) => {
        if (child.getPluginData('zIndex') !== '' && child.getPluginData('zIndex') !== null) {
          console.log('set zindex by pluginData: ', child.getPluginData('zIndex'), child);
          child.setParentIndex(child.getPluginData('zIndex'));
        }
      });
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

export function handleModifyShape(payload) {
  const { shapeId, propertiesToModify, propertiesToRemove } = payload;

  try {
    let shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

    shape = applyModifyParamsToShape(shape, propertiesToModify || {}, propertiesToRemove || []);

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
      const ok = currentValue === 'mixed' || valueMatches(currentValue, proposedValue);
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
        (r) => `${r.key} '${r.proposed}' rejected (actual: ${r.actual})`
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

export function handleDeleteShape(payload) {
  const { shapeId } = payload;

  try {
    const shape = penpot.currentPage?.getShapeById(shapeId);
    if (!shape) {
      throw new Error(`Shape with ID ${shapeId} not found`);
    }

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
