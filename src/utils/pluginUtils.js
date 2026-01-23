import { MessageSourceName, ClientQueryType } from "@/types/types";

export const drawShape = async (shapeType, params) => {
  const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
    shapeType,
    params,
  });
  return response;
}

export const modifyShape = async (shapeId, params) => {
  const response = await sendMessageToPlugin(ClientQueryType.MODIFY_SHAPE, {
    shapeId,
    params,
  });

  return response;
}

export const deleteShape = async (shapeId) => {
  const response = await sendMessageToPlugin(ClientQueryType.DELETE_SHAPE, {
    shapeId,
  });
  
  return response;
}

/**
 * Creates an array of shapes from a list of shape definitions.
 * Shapes are sorted by zIndex before creation to ensure proper stacking order.
 * - When parentId is provided (shapes added to board/component): descending order (highest zIndex first)
 * - When parentId is not provided: ascending order (lowest zIndex first)
 * 
 * @param shapes - Array of shape definitions with type and zIndex
 * @param options - Optional configuration (parentId to set as parent for all shapes, throwOnError to throw on failure)
 * @returns Array of created shape information including id, name, type, and response
 */
export const createShapesArray = async (
  shapes,
  options = {}
) => {
  const { parentId, throwOnError = false } = options;
  
  // Sort shapes by zIndex:
  // - When adding to board/component (parentId): descending (highest zIndex first, appears on top)
  // - When creating standalone shapes: ascending (lowest zIndex first, appears below)
  const orderedShapes = [...shapes].sort((a, b) => 
    b.zIndex - a.zIndex
  );

  const createdShapes = [];
  
  for (const shape of orderedShapes) {
    const { type, zIndex, ...shapeParams } = shape;
    
    // Set parentId if provided
    // Note: zIndex is excluded from shapeParams as it's only used for sorting, not for the API call
    const shapeParamsWithParent = parentId 
      ? { ...shapeParams, parentId }
      : shapeParams;
    
    const response = await drawShape(type, shapeParamsWithParent);
    
    if (response.success) {
      const shapeId = response.payload?.shape?.id;
      if (shapeId) {
        createdShapes.push({
          id: shapeId,
          name: shape.name,
          type: shape.type,
          response, // Response already curated by drawShape
        });
      } else if (throwOnError) {
        throw new Error(`Failed to get shape ID for shape: ${shape.name}`);
      }
    } else {
      if (throwOnError) {
        throw new Error(`Failed to create shape "${shape.name}": ${response.message}`);
      }
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

