import { MessageSourceName, ClientQueryType } from "@/types/types";

export const drawShape = async (shapeType, params) => {
  try {
    const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
      shapeType,
      params,
    });
    return response;
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to communicate with plugin',
      payload: {
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * Creates an array of shapes from a list of shape definitions.
 * Shapes are created in the order provided. Use parent.zIndex to control stacking.
 * 
 * @param shapes - Array of shape definitions with type and zIndex
 * @param options - Optional configuration (parentId to set as parent for all shapes, throwOnError to throw on failure)
 * @returns Array of created shape information including id, name, type, and response
 */
export const createShapesArray = async (shapes, options = {}) => {
  const { parentId, throwOnError = false } = options;
  const createdShapes = [];

  for (const shape of shapes) {
    const { type, parentId: shapeParentId, zIndex, ...shapeParams } = shape;
    const resolvedParentId = parentId || shapeParentId;
    const shapeParamsWithParent = resolvedParentId
      ? { ...shapeParams, parentId: resolvedParentId, zIndex }
      : { ...shapeParams, zIndex };

    const response = await drawShape(type, shapeParamsWithParent);
    
    if (response.success) {
      const shapeId = response.payload?.shape?.id;
      if (shapeId) {
        createdShapes.push({
          id: shapeId,
          name: shape.name,
          type: shape.type,
          response,
        });
      } else if (throwOnError) {
        throw new Error(`Failed to get shape ID for shape: ${shape.name}`);
      } else {
        createdShapes.push({ id: null, name: shape.name, type: shape.type, response });
      }
    } else {
      if (throwOnError) {
        throw new Error(`Failed to create shape "${shape.name}": ${response.message}`);
      }
      createdShapes.push({ id: null, name: shape.name, type: shape.type, response });
    }
  }
  
  return createdShapes;
}

export const sendMessageToPlugin = async (type, payload) => {
  const messageId = crypto.randomUUID();
  const queryMessage = {
    source: MessageSourceName.Client,
    messageId,
    type,
    payload,
  };

  const responseMessagePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Failed to send message to plugin'));
    }, 30000);

    const handleMessage = (event) => {
      const { source, messageId: responseMessageId, ...response } = event.data;
      if (
        source === MessageSourceName.Plugin
        && messageId === responseMessageId
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        resolve(response);
      }
    }
    window.addEventListener('message', handleMessage);
  });

  window.parent.postMessage(queryMessage, '*');

  return responseMessagePromise;
}

