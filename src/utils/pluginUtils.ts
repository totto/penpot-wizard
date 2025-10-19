import { Rectangle } from "@penpot/plugin-types";

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
    messageId: '',
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
          project: {
            name: 'Project 1',
            id: '123',
            pages: [
              {
                name: 'Page 1',
                id: '456',
              },
            ],
          },
          availableFonts: [
            {
              name: 'Font 1',
              fontId: '123',
              fontFamily: 'Font Family 1',
            },
          ],
          currentPage: {
            name: 'Page 1',
            id: '456',
            shapes: [
              {
                type: PenpotShapeType.RECTANGLE,
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                fills: [{ fillColor: 'red' }],
                id: '123',
                name: 'Rectangle 1',
              } as Rectangle,
            ],
          },
        },
      };

    default:
      return {
        ...pluginMessage,
        success: false,
        message: 'Unknown query type',
      };
  }
}
