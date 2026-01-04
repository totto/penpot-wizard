import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
  ClientMessage,
  AddImageQueryPayload,
  DrawShapeQueryPayload,
  CreateComponentQueryPayload,
  CreateGroupQueryPayload,
  ModifyShapeQueryPayload,
  DeleteShapeQueryPayload,
  PluginResponseMessage,
} from '../types/types';

import { handleDrawShape, handleCreateComponent, handleCreateGroup, handleModifyShape, handleDeleteShape } from './drawHandlers';
import { handleGetProjectData, handleGetUserData, handleAddImage, getCurrentPage, getAvailableFonts } from './mainHandlers';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 700,
});

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme: string) => {
  penpot.ui.sendMessage({
    type: PluginMessageType.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

penpot.ui.onMessage(async (message: ClientMessage) => {
  const { type, messageId, payload, source } = message;

  if (source !== MessageSourceName.Client) {
    return ;
  }

  let responseMessage: PluginResponseMessage;

  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      responseMessage = handleDrawShape(payload as DrawShapeQueryPayload);
      break;

    case ClientQueryType.ADD_IMAGE:
      responseMessage = await handleAddImage(payload as AddImageQueryPayload);
      break;

    case ClientQueryType.CREATE_COMPONENT:
      responseMessage = handleCreateComponent(payload as CreateComponentQueryPayload);
      break;

    case ClientQueryType.CREATE_GROUP:
      responseMessage = handleCreateGroup(payload as CreateGroupQueryPayload);
      break;

    case ClientQueryType.MODIFY_SHAPE:
      responseMessage = handleModifyShape(payload as ModifyShapeQueryPayload);
      break;

    case ClientQueryType.DELETE_SHAPE:
      responseMessage = handleDeleteShape(payload as DeleteShapeQueryPayload);
      break;

    case ClientQueryType.GET_USER_DATA:
      responseMessage = handleGetUserData();
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responseMessage = handleGetProjectData();
      break;

    case ClientQueryType.GET_AVAILABLE_FONTS:
      responseMessage = getAvailableFonts();
      break;

    case ClientQueryType.GET_CURRENT_PAGE:
      responseMessage = getCurrentPage();
      break;

    default:
      responseMessage = {
        source: MessageSourceName.Plugin,
        type: type,
        messageId: messageId,
        message: `unknown command: ${type}`,
        success: false,
      };
      break;
  }
  responseMessage.messageId = messageId;
  penpot.ui.sendMessage(responseMessage);
});
