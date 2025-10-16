import {
  ClientQueryType,
  MessageSourceName,
  ClientQueryMessage,
  PluginResponsePayload,
} from "@/types/types";

export const sendMessageToPlugin = async (type: ClientQueryType, payload?: any) => {
  if (!window.parent || window.parent === window) {
    return localResponse(type);
  }
  
  const callId = crypto.randomUUID();

  const queryMessage: ClientQueryMessage = {
    source: MessageSourceName.Client,
    callId,
    type,
    payload,
  };

  const responseMessagePromise = new Promise<PluginResponsePayload>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Failed to send message to plugin'));
    }, 10000);

    const handleMessage = (event: MessageEvent) => {
      const { source, callId: responseCallId, queryType, payload } = event.data;

      if (
        source === MessageSourceName.Plugin
        && callId === responseCallId
        && queryType === type
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        resolve(payload as PluginResponsePayload);
      }
    }
    window.addEventListener('message', handleMessage);
  });

  window.parent.postMessage(queryMessage, '*');

  return responseMessagePromise;
}

function localResponse(type: ClientQueryType) {
  const responsePayload: PluginResponsePayload = {
    success: true,
    description: 'Successfully resolved',
  };

  switch (type) {
    case ClientQueryType.GET_USER_DATA:
      responsePayload.data = {
        name: 'Axel',
        id: '123',
      };
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responsePayload.data = {
        name: 'Project 1',
        id: '456',
      };
      break;
  
    default:
      break;
  }

  return new Promise((resolve) => {
    resolve(responsePayload);
  });
}
