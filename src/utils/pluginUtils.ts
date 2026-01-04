import {
  ClientQueryType,
  MessageSourceName,
  ClientMessage,
  PenpotShapeType,
  PluginMessage,
  PluginResponseMessage,
  ClientQueryPayload,
  DrawShapeResponsePayload,
} from "@/types/types";
import { PenpotShapeProperties, ModifyShapeProperties, BaseShapeProperties } from "@/types/shapeTypes";

export const drawShape = async (shapeType: PenpotShapeType, params: PenpotShapeProperties) => {
  const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
    shapeType,
    params,
  });
  
  return response;
}

export const modifyShape = async (shapeId: string, params: Omit<ModifyShapeProperties, 'shapeId'>) => {
  const response = await sendMessageToPlugin(ClientQueryType.MODIFY_SHAPE, {
    shapeId,
    params,
  });
  
  return response;
}

export interface CreatedShapeInfo {
  id: string;
  name: string;
  type: string;
  response: PluginResponseMessage;
}

export interface CreateShapesOptions {
  parentId?: string;
  throwOnError?: boolean;
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
  shapes: (BaseShapeProperties & { type: string })[],
  options: CreateShapesOptions = {}
): Promise<CreatedShapeInfo[]> => {
  const { parentId, throwOnError = false } = options;
  
  // Sort shapes by zIndex:
  // - When adding to board/component (parentId): descending (highest zIndex first, appears on top)
  // - When creating standalone shapes: ascending (lowest zIndex first, appears below)
  const orderedShapes = [...shapes].sort((a, b) => 
    parentId ? b.zIndex - a.zIndex : a.zIndex - b.zIndex
  );
  
  const createdShapes: CreatedShapeInfo[] = [];
  
  for (const shape of orderedShapes) {
    const { type, zIndex, ...shapeParams } = shape;
    
    // Set parentId if provided
    // Note: zIndex is excluded from shapeParams as it's only used for sorting, not for the API call
    const shapeParamsWithParent = parentId 
      ? { ...shapeParams, parentId }
      : shapeParams;
    
    const response = await drawShape(type as PenpotShapeType, shapeParamsWithParent as PenpotShapeProperties);
    
    if (response.success) {
      const shapeId = (response.payload as DrawShapeResponsePayload)?.shape?.id;
      if (shapeId) {
        createdShapes.push({
          id: shapeId,
          name: shape.name,
          type: shape.type,
          response,
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

export const sendMessageToPlugin = async (type: ClientQueryType, payload?: ClientQueryPayload): Promise<PluginResponseMessage> => {
  if (!window.parent || window.parent === window) {
    return localResponse(type);
  }
  
  const messageId = crypto.randomUUID();

  const queryMessage: ClientMessage = {
    source: MessageSourceName.Client,
    messageId,
    type,
    payload,
  };

  const responseMessagePromise = new Promise<PluginResponseMessage>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Failed to send message to plugin'));
    }, 30000);

    const handleMessage = (event: MessageEvent) => {
      const { source, messageId: responseMessageId } = event.data;

      if (
        source === MessageSourceName.Plugin
        && messageId === responseMessageId
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        resolve(event.data as PluginResponseMessage);
      }
    }
    window.addEventListener('message', handleMessage);
  });

  window.parent.postMessage(queryMessage, '*');

  return responseMessagePromise;
}

function localResponse(type: ClientQueryType): PluginResponseMessage {
  
  const pluginMessage: PluginMessage = {
    source: MessageSourceName.Plugin,
    type: type,
    messageId: '1234',
    message: 'Successfully resolved in local',
  };

  switch (type) {
    case ClientQueryType.GET_USER_DATA:
      return {
        ...pluginMessage,
        success: true,
        payload: {
          name: 'Axel',
          id: '123',
        },
      };

    case ClientQueryType.GET_PROJECT_DATA:
      return {
        ...pluginMessage,
        success: true,
        payload: {
          name: 'Project 1',
          id: '123',
          pages: [
            {
              name: 'Page 1',
              id: '456',
            },
          ],
        },
      };

    default:
      return {
        ...pluginMessage,
        success: true,
      };
  }
}
