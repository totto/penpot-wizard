import { PluginMessageType, ClientQueryType, MessageSourceName, PluginResponsePayload } from '../types/types';
import { handleDrawShape } from './drawHandlers';
import { handleGetProjectData, handleGetUserData, handleAddImage } from './mainHandlers';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 700,
});

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme: string) => {
  console.log('Theme changed to:', newTheme);
  
  // Send message to the app about theme change
  penpot.ui.sendMessage({
    type: PluginMessageType.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

function sendResponseToClient(callId: string, queryType: ClientQueryType, payload: any) {
  penpot.ui.sendMessage({
    source: MessageSourceName.Plugin,
    callId,
    queryType,
    payload,
  });
}

penpot.ui.onMessage(async (message: any) => {
  const { type, callId, payload, source } = message;

  if (source !== MessageSourceName.Client) {
    return ;
  }
  
  let responsePayload: PluginResponsePayload;

  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      responsePayload = handleDrawShape(payload);
      break;

    case ClientQueryType.ADD_IMAGE:
      responsePayload = await handleAddImage(payload);
      break;

    case ClientQueryType.GET_USER_DATA:
      responsePayload = handleGetUserData();
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responsePayload = handleGetProjectData();
      break;

    default:
      responsePayload = {
        success: false,
        description: `unknown command: ${type}`,
        data: null,
      };
  }

  sendResponseToClient(callId, type, responsePayload);
});
