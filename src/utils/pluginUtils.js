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

