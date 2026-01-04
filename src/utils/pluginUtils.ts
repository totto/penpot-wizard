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
import { 
  PenpotShapeProperties, 
  ModifyShapeProperties, 
  BaseShapeProperties,
  baseShapeProperties,
  pathShapeProperties,
  textShapeProperties,
} from "@/types/shapeTypes";
import type { Shape } from '@penpot/plugin-types';

/**
 * Curates a shape object by removing properties that are:
 * - Computed/derived (bounds, center, parentX, parentY, boardX, boardY)
 * - Not configurable on creation (rotation, flipX, flipY, blocked, hidden, etc.)
 * - Internal Penpot properties (parentIndex, layoutChild, layoutCell, tokens, etc.)
 * 
 * Uses the shape type schemas from shapeTypes.ts to determine which properties to keep.
 * This ensures that as new properties are added to the schemas, they will automatically
 * be included in the output.
 * 
 * @param shape - The raw shape object from Penpot plugin
 * @returns A curated shape object with only relevant and configurable properties
 */
export function curateShapeOutput(shape: Shape | Record<string, unknown>): Record<string, unknown> {
  if (!shape || typeof shape !== 'object') {
    return shape as Record<string, unknown>;
  }

  // Convert to Record for safe property access
  const shapeRecord = shape as Record<string, unknown>;
  const shapeType = shapeRecord.type as string | undefined;
  const shapeId = shapeRecord.id as string | undefined;
  
  if (!shapeType) {
    // If no type, return minimal object with just id if available
    return shapeId ? { id: shapeId } : {};
  }

  // Determine which schema to use based on shape type
  let validSchema: typeof baseShapeProperties | typeof pathShapeProperties | typeof textShapeProperties;
  
  switch (shapeType) {
    case 'path':
      validSchema = pathShapeProperties;
      break;
    case 'text':
      validSchema = textShapeProperties;
      break;
    case 'rectangle':
    case 'ellipse':
    case 'board':
    default:
      validSchema = baseShapeProperties;
      break;
  }

  // Get all valid keys from the schema
  // We need to extract keys from the Zod schema shape
  const schemaShape = validSchema.shape;
  const validKeys = new Set(Object.keys(schemaShape));
  
  // Always include id and type (they come from Penpot but aren't in creation schemas)
  validKeys.add('id');
  validKeys.add('type');

  // Extract parentId from parent object if it exists
  let parentId: string | undefined;
  const parent = shapeRecord.parent;
  if (parent) {
    if (typeof parent === 'object' && parent !== null && 'id' in parent) {
      parentId = (parent as { id: unknown }).id as string;
    } else if (typeof parent === 'string') {
      parentId = parent;
    }
  } else if ('parentId' in shapeRecord && typeof shapeRecord.parentId === 'string') {
    parentId = shapeRecord.parentId;
  }

  // Build curated shape object
  const curated: Record<string, unknown> = {
    id: shapeId,
    type: shapeType,
  };

  // Add parentId if it exists
  if (parentId) {
    curated.parentId = parentId;
  }

  // Copy only valid properties from the shape
  for (const key of validKeys) {
    if (key === 'id' || key === 'type' || key === 'parentId') {
      // Already handled above
      continue;
    }

    if (key in shapeRecord && shapeRecord[key] !== undefined) {
      const value = shapeRecord[key];
      
      // Handle arrays (fills, strokes, shadows, content)
      if (Array.isArray(value)) {
        // For arrays, we keep them as-is but they should already be in the correct format
        // from the plugin response
        curated[key] = value;
      } else {
        curated[key] = value;
      }
    }
  }

  return curated;
}

/**
 * Curates a plugin response that contains a shape by cleaning the shape object
 */
export function curateShapeResponse(response: PluginResponseMessage): PluginResponseMessage {
  if (!response.success || !response.payload) {
    return response;
  }

  const payload = response.payload as unknown as Record<string, unknown>;
  
  // Handle DrawShapeResponsePayload and ModifyShapeResponsePayload
  if ('shape' in payload && payload.shape) {
    return {
      ...response,
      payload: {
        ...payload,
        shape: curateShapeOutput(payload.shape as Shape) as unknown as Shape,
      } as unknown as typeof response.payload,
    };
  }

  // Handle CreateGroupResponsePayload
  if ('group' in payload && payload.group) {
    return {
      ...response,
      payload: {
        ...payload,
        group: curateShapeOutput(payload.group as Shape) as unknown as Shape,
      } as unknown as typeof response.payload,
    };
  }

  return response;
}

export const drawShape = async (shapeType: PenpotShapeType, params: PenpotShapeProperties) => {
  const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
    shapeType,
    params,
  });
  
  return curateShapeResponse(response);
}

export const modifyShape = async (shapeId: string, params: Omit<ModifyShapeProperties, 'shapeId'>) => {
  const response = await sendMessageToPlugin(ClientQueryType.MODIFY_SHAPE, {
    shapeId,
    params,
  });
  
  return curateShapeResponse(response);
}

export const deleteShape = async (shapeId: string) => {
  const response = await sendMessageToPlugin(ClientQueryType.DELETE_SHAPE, {
    shapeId,
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
