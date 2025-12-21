import {
  ClientQueryType,
  MessageSourceName,
  ClientMessage,
  PenpotShapeType,
  PluginMessage,
  PluginResponseMessage,
  ClientQueryPayload,
} from "@/types/types";
import { PenpotShapeProperties } from "@/types/shapeTypes";

export const drawShape = async (shapeType: PenpotShapeType, params: PenpotShapeProperties) => {
  const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
    shapeType,
    params,
  });
  
  return response;
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
